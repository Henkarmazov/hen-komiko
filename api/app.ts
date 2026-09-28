import express from "express";
import fetch from "node-fetch";

const app = express();
const SHINIGAMI_BASE = "https://www.sankavollerei.web.id";

// Helper for HTTP requests with timeout and standard headers
async function fetchApi(endpoint: string, options: any = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${SHINIGAMI_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    timeout: 12000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Shinigami API error: ${response.status} ${response.statusText} at ${endpoint}`);
  }

  return await response.json();
}

// Helper to map Shinigami Manga Object to Frontend ComicData
function mapMangaItem(item: any) {
  const manga = item?.manga || item || {};
  const genres = Array.isArray(manga.genres)
    ? manga.genres.map((g: any) => (typeof g === "string" ? g : (g?.name || ""))).filter(Boolean)
    : [];

  const chapterNum = manga.latest_chapter ?? manga.chapter ?? "";
  const chapterStr = chapterNum !== "" ? `Ch. ${chapterNum}` : "Ch. Baru";

  return {
    title: manga.title || "",
    slug: manga.manga_id || "",
    url: manga.manga_id || "",
    desc: manga.description || "",
    chapter: chapterStr,
    cover: manga.cover || manga.cover_portrait || manga.thumbnail || "",
    background: manga.cover_portrait || manga.cover || "",
    genres: genres,
    rating: manga.rating != null ? String(manga.rating) : ""
  };
}

// Helper to map Shinigami Slider Item to Frontend ComicData
function mapSliderItem(item: any) {
  const badges = Array.isArray(item?.badges)
    ? item.badges.map((b: any) => (typeof b === "string" ? b : (b?.name || ""))).filter(Boolean)
    : [];

  return {
    title: item.title || "",
    slug: item.manga_id || String(item.id || ""),
    url: item.manga_id || "",
    desc: item.description || "",
    chapter: "Featured",
    cover: item.chara_image || item.background_image || "",
    background: item.background_image || item.chara_image || "",
    genres: badges,
    rating: item.rating != null ? String(item.rating) : ""
  };
}

// Helper to map Shinigami Chapter Item to Frontend Chapter
function mapChapterItem(ch: any) {
  const chNum = ch.chapter_number != null ? ch.chapter_number : "";
  const name = ch.chapter_title
    ? `Chapter ${chNum} - ${ch.chapter_title}`
    : (chNum !== "" ? `Chapter ${chNum}` : (ch.title || "Chapter"));

  return {
    name,
    number: ch.chapter_number != null ? Number(ch.chapter_number) : null,
    url: ch.chapter_id || "",
    slug: ch.chapter_id || "",
    date: ch.release_date
      ? new Date(ch.release_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : ""
  };
}

// 1. API Route: /api/home
app.get("/api/home", async (req, res) => {
  try {
    // Fetch home data and slider in parallel
    const [homeResult, sliderResult] = await Promise.allSettled([
      fetchApi("/comic/shinigami/home"),
      fetchApi("/comic/shinigami/slider")
    ]);

    const homeData: any = homeResult.status === "fulfilled" ? homeResult.value?.data : null;
    const sliderData: any = sliderResult.status === "fulfilled" ? sliderResult.value?.data : null;

    if (!homeData) {
      throw new Error("Gagal mengambil data beranda dari Shinigami");
    }

    const latest = (homeData.latest || []).map(mapMangaItem);
    const recommended = (homeData.recommended || []).map(mapMangaItem);
    const popular = (homeData.popular || []).map(mapMangaItem);

    // If slider endpoint provided items, map them, otherwise fall back to recommended/popular
    let slider = [];
    if (Array.isArray(sliderData) && sliderData.length > 0) {
      slider = sliderData.map(mapSliderItem);
    } else if (recommended.length > 0) {
      slider = recommended;
    } else {
      slider = latest.slice(0, 5);
    }

    const popularToday = popular.length > 0 ? popular : latest.slice(0, 10);
    const popularSerial = {
      weekly: popular,
      monthly: recommended.length > 0 ? recommended : popular,
      alltime: popular
    };

    res.json({
      status: true,
      data: {
        slider,
        latest,
        popularToday,
        popularSerial
      }
    });
  } catch (error: any) {
    console.error("Error fetching home data:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error"
    });
  }
});

// 2. API Route: /api/detail
app.get("/api/detail", async (req, res) => {
  let mangaId = ((req.query.url || req.query.id || req.query.manga_id) as string || "").trim();
  if (!mangaId) {
    return res.status(400).json({ status: false, message: "ID atau URL komik wajib diisi" });
  }

  // Handle case where full URL or path was passed
  if (mangaId.includes("/")) {
    const parts = mangaId.split("/").filter(Boolean);
    mangaId = parts[parts.length - 1];
  }

  const page = parseInt((req.query.page as string) || "1", 10) || 1;
  const pageSize = Math.min(Math.max(parseInt((req.query.page_size as string) || "50", 10) || 50, 10), 100);

  try {
    // Fetch detail metadata and chapters list in parallel
    const [detailResult, chaptersResult] = await Promise.allSettled([
      fetchApi(`/comic/shinigami/detail/${encodeURIComponent(mangaId)}`),
      fetchApi(`/comic/shinigami/chapters/${encodeURIComponent(mangaId)}?page=${page}&page_size=${pageSize}`)
    ]);

    if (detailResult.status !== "fulfilled" || !detailResult.value?.data) {
      throw new Error("Detail komik tidak ditemukan");
    }

    const data = detailResult.value.data;
    const chaptersRaw = chaptersResult.status === "fulfilled" ? chaptersResult.value?.data : [];
    const chaptersRawPagination = chaptersResult.status === "fulfilled" ? chaptersResult.value?.pagination : null;

    // Map chapters
    let chapters = (Array.isArray(chaptersRaw) ? chaptersRaw : []).map(mapChapterItem);

    // If chapters list was empty, try using latest_chapter
    if (chapters.length === 0 && data.latest_chapter?.chapter_id) {
      chapters.push({
        name: `Chapter ${data.latest_chapter.chapter_number || 1}`,
        number: data.latest_chapter.chapter_number != null ? Number(data.latest_chapter.chapter_number) : 1,
        url: data.latest_chapter.chapter_id,
        slug: data.latest_chapter.chapter_id,
        date: data.latest_chapter.updated_at
          ? new Date(data.latest_chapter.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
          : ""
      });
    }

    const pagination = {
      current_page: chaptersRawPagination?.current_page ? Number(chaptersRawPagination.current_page) : page,
      total_pages: chaptersRawPagination?.total_pages ? Number(chaptersRawPagination.total_pages) : 1,
      total_record: chaptersRawPagination?.total_record ? Number(chaptersRawPagination.total_record) : chapters.length,
      page_size: chaptersRawPagination?.page_size ? Number(chaptersRawPagination.page_size) : pageSize
    };

    const genres = Array.isArray(data.genres)
      ? data.genres.map((g: any) => (typeof g === "string" ? g : (g?.name || ""))).filter(Boolean)
      : [];

    const formatName = Array.isArray(data.format)
      ? (data.format[0]?.name || "")
      : (typeof data.format === "string" ? data.format : "");

    const typeName = Array.isArray(data.type)
      ? (data.type[0]?.name || "")
      : (typeof data.type === "string" ? data.type : "");

    const authors = Array.isArray(data.authors)
      ? data.authors.map((a: any) => (typeof a === "string" ? a : (a?.name || ""))).filter(Boolean).join(", ")
      : "";

    const artists = Array.isArray(data.artists)
      ? data.artists.map((a: any) => (typeof a === "string" ? a : (a?.name || ""))).filter(Boolean).join(", ")
      : "";

    const mappedData = {
      title: data.title || "",
      slug: data.manga_id || mangaId,
      cover: data.cover || data.cover_portrait || "",
      banner: data.cover_portrait || data.cover || "",
      rating: data.rating != null ? String(data.rating) : "",
      synopsis: data.description || "",
      genres: genres,
      info: {
        judul_alt: data.alternative_title || "",
        status: data.status || "Ongoing",
        jenis_komik: formatName || typeName || "Manga",
        pengarang: authors || "-",
        artist: artists || "-"
      },
      chapters,
      pagination
    };

    res.json({
      status: true,
      data: mappedData
    });
  } catch (error: any) {
    console.error("Error fetching detail data:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error"
    });
  }
});

// 2b. API Route: /api/chapters (pagination for chapters in detail view)
app.get("/api/chapters", async (req, res) => {
  let mangaId = ((req.query.url || req.query.id || req.query.manga_id) as string || "").trim();
  if (!mangaId) {
    return res.status(400).json({ status: false, message: "ID atau URL komik wajib diisi" });
  }

  if (mangaId.includes("/")) {
    const parts = mangaId.split("/").filter(Boolean);
    mangaId = parts[parts.length - 1];
  }

  const page = parseInt((req.query.page as string) || "1", 10) || 1;
  const pageSize = Math.min(Math.max(parseInt((req.query.page_size as string) || "50", 10) || 50, 10), 100);

  try {
    const result = await fetchApi(`/comic/shinigami/chapters/${encodeURIComponent(mangaId)}?page=${page}&page_size=${pageSize}`);
    const chaptersRaw = result?.data || [];
    const chapters = (Array.isArray(chaptersRaw) ? chaptersRaw : []).map(mapChapterItem);

    const paginationRaw = result?.pagination;
    const pagination = {
      current_page: paginationRaw?.current_page ? Number(paginationRaw.current_page) : page,
      total_pages: paginationRaw?.total_pages ? Number(paginationRaw.total_pages) : 1,
      total_record: paginationRaw?.total_record ? Number(paginationRaw.total_record) : chapters.length,
      page_size: paginationRaw?.page_size ? Number(paginationRaw.page_size) : pageSize
    };

    res.json({
      status: true,
      data: {
        chapters,
        pagination
      }
    });
  } catch (error: any) {
    console.error("Error fetching chapters:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error"
    });
  }
});

// 3. API Route: /api/chapter
app.get("/api/chapter", async (req, res) => {
  let chapterId = ((req.query.url || req.query.id || req.query.chapter_id) as string || "").trim();
  if (!chapterId) {
    return res.status(400).json({ status: false, message: "ID atau URL chapter wajib diisi" });
  }

  if (chapterId.includes("/")) {
    const parts = chapterId.split("/").filter(Boolean);
    chapterId = parts[parts.length - 1];
  }

  try {
    const result = await fetchApi(`/comic/shinigami/read/${encodeURIComponent(chapterId)}`);
    const data = result?.data;

    if (!data) {
      throw new Error("Isi chapter tidak ditemukan");
    }

    const title = data.chapter_title
      ? `Chapter ${data.chapter_number} - ${data.chapter_title}`
      : (data.chapter_number != null ? `Chapter ${data.chapter_number}` : "Chapter");

    const images = Array.isArray(data.images) ? data.images : [];

    const prevChapter = data.prev_chapter ? {
      chapter_id: data.prev_chapter.chapter_id,
      chapter_number: data.prev_chapter.chapter_number,
      url: data.prev_chapter.chapter_id
    } : null;

    const nextChapter = data.next_chapter ? {
      chapter_id: data.next_chapter.chapter_id,
      chapter_number: data.next_chapter.chapter_number,
      url: data.next_chapter.chapter_id
    } : null;

    res.json({
      status: true,
      data: {
        title,
        chapter_number: data.chapter_number,
        prev_chapter: prevChapter,
        next_chapter: nextChapter,
        images
      }
    });
  } catch (error: any) {
    console.error("Error fetching chapter data:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error"
    });
  }
});

// 4. API Route: /api/search
app.get("/api/search", async (req, res) => {
  const query = ((req.query.q || req.query.query) as string || "").trim();
  if (!query) {
    return res.status(400).json({ status: false, message: "Kata kunci pencarian wajib diisi" });
  }

  try {
    const result = await fetchApi(`/comic/shinigami/search/${encodeURIComponent(query)}`);
    const data = result?.data;

    if (!data || !Array.isArray(data)) {
      return res.json({ status: true, data: [] });
    }

    const mappedData = data.map((item: any) => {
      const manga = item?.manga || item || {};
      const chapterNum = manga.latest_chapter ?? manga.chapter ?? "";
      return {
        title: manga.title || "",
        url: manga.manga_id || "",
        slug: manga.manga_id || "",
        cover: manga.cover || manga.cover_portrait || manga.thumbnail || "",
        chapter: chapterNum !== "" ? `Ch. ${chapterNum}` : "",
        rating: manga.rating != null ? String(manga.rating) : "",
        genres: (manga.genres || []).map((g: any) => (typeof g === "string" ? g : (g?.name || ""))).filter(Boolean)
      };
    });

    res.json({
      status: true,
      data: mappedData
    });
  } catch (error: any) {
    console.error("Error searching comics:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error"
    });
  }
});

// 5. API Route: /api/genres
app.get("/api/genres", async (req, res) => {
  try {
    const result = await fetchApi("/comic/shinigami/genres");
    const rawGenres = result?.data || [];

    const genres = (Array.isArray(rawGenres) ? rawGenres : []).map((g: any) => ({
      name: g.name || "",
      slug: g.slug || "",
      count: ""
    }));

    res.json({
      status: true,
      data: genres
    });
  } catch (error: any) {
    console.error("Error fetching genres:", error);
    res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
});

// 6. API Route: /api/genres/:slug
app.get("/api/genres/:slug", async (req, res) => {
  const slug = req.params.slug;
  const page = (req.query.page as string) || "1";

  try {
    const result = await fetchApi(`/comic/shinigami/advanced-search?genre_include=${encodeURIComponent(slug)}&page=${page}`);
    const data = result?.data || [];

    const mapped = (Array.isArray(data) ? data : []).map(mapMangaItem);

    res.json({
      status: true,
      data: mapped,
      pagination: result?.pagination || { current_page: Number(page), total_pages: 1, total_record: mapped.length, page_size: 24 }
    });
  } catch (error: any) {
    console.error(`Error fetching genre ${slug}:`, error);
    res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
});

// 7. API Route: /api/filter
app.get("/api/filter", async (req, res) => {
  const { genre, status, type, order, page } = req.query;

  try {
    const params = new URLSearchParams();

    if (genre) {
      if (Array.isArray(genre)) {
        params.append("genre_include", genre.join(","));
      } else {
        params.append("genre_include", String(genre));
      }
      params.append("genre_include_mode", "or");
    }

    if (status) {
      params.append("status", String(status));
    }

    if (type) {
      params.append("format", String(type));
    }

    if (order) {
      params.append("sort", String(order));
    }

    params.append("page", (page as string) || "1");

    const result = await fetchApi(`/comic/shinigami/advanced-search?${params.toString()}`);
    const data = result?.data || [];

    const mapped = (Array.isArray(data) ? data : []).map(mapMangaItem);

    res.json({
      status: true,
      data: mapped
    });
  } catch (error: any) {
    console.error("Error filtering comics:", error);
    res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
});

export { app };
