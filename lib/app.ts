<<<<<<< HEAD
import express from "express";
import path from "path";
import fetch from "node-fetch";

const app = express();

// API Route: /api/home
app.get("/api/home", async (req, res) => {
  try {
    const response = await fetch("https://hex-komikmama.vercel.app/api/home");
    
    if (!response.ok) {
      throw new Error(`External API returned status ${response.status}`);
    }

    const rawData: any = await response.json();
    
    const mapItem = (item: any) => ({
      title: item.title || "",
      slug: item.slug || "",
      url: item.url || "",
      desc: item.desc || "",
      chapter: item.chapter || (item.lastChapter?.name || ""),
      cover: item.thumb || item.image || "",
      background: item.background || "",
      genres: item.genres || [],
      rating: item.rating || ""
    });

    const slider = (rawData?.data?.slider || []).map(mapItem);
    const latest = (rawData?.data?.latest || []).map(mapItem);
    const popularToday = (rawData?.data?.popularToday || []).map(mapItem);
    const popularSerial = {
      weekly: (rawData?.data?.popularSerial?.weekly || []).map(mapItem),
      monthly: (rawData?.data?.popularSerial?.monthly || []).map(mapItem),
      alltime: (rawData?.data?.popularSerial?.alltime || []).map(mapItem)
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

// API Route: /api/detail
app.get("/api/detail", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ status: false, message: "URL is required" });
  }

  try {
    const response = await fetch(`https://hex-komikmama.vercel.app/api/detail?url=${encodeURIComponent(targetUrl)}`);
    
    if (!response.ok) {
      throw new Error(`External API returned status ${response.status}`);
    }

    const rawData: any = await response.json();
    const data = rawData?.data;

    if (!data) {
      throw new Error("Data not found");
    }

    const mappedData = {
      title: data.title || "",
      slug: data.slug || "",
      cover: data.thumb || "",
      banner: data.banner || "",
      rating: data.rating || "",
      synopsis: data.synopsis || "",
      genres: data.genres || [],
      info: {
        judul_alt: data.info?.judul_alt || "",
        status: data.info?.status || "",
        jenis_komik: data.info?.jenis_komik || "",
        pengarang: data.info?.pengarang || "",
        artist: data.info?.artist || ""
      },
      chapters: (data.chapters || []).map((ch: any) => ({
        name: ch.name || "",
        url: ch.url || "",
        slug: ch.slug || "",
        date: ch.date || ""
      }))
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

// API Route: /api/search
app.get("/api/search", async (req, res) => {
  const query = req.query.q as string;
  const page = req.query.page as string || '1';
  if (!query) {
    return res.status(400).json({ status: false, message: "Query is required" });
  }

  try {
    const response = await fetch(`https://hex-komikmama.vercel.app/api/search?q=${encodeURIComponent(query)}&page=${page}`);
    
    if (!response.ok) {
      throw new Error(`External API returned status ${response.status}`);
    }

    const rawData: any = await response.json();
    const data = rawData?.data;

    if (!data) {
      return res.json({ status: true, data: [] });
    }

    const mappedData = data.map((item: any) => ({
      title: item.title || "",
      url: item.url || "",
      slug: item.slug || "",
      cover: item.thumb || "",
      chapter: item.chapter || "",
      rating: item.rating || "",
      genres: item.genres || []
    }));

    res.json({
      status: true,
      data: mappedData
    });
  } catch (error: any) {
    console.error("Error fetching search data:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error"
    });
  }
});

// API Route: /api/genres
app.get("/api/genres", async (req, res) => {
  try {
    const response = await fetch("https://hex-komikmama.vercel.app/api/genres");
    if (!response.ok) throw new Error(`External API returned status ${response.status}`);
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// API Route: /api/genres/:slug
app.get("/api/genres/:slug", async (req, res) => {
  const slug = req.params.slug;
  const page = req.query.page || '1';
  try {
    const response = await fetch(`https://hex-komikmama.vercel.app/api/genres/${slug}?page=${page}`);
    if (!response.ok) throw new Error(`External API returned status ${response.status}`);
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// API Route: /api/filter
app.get("/api/filter", async (req, res) => {
  const { genre, status, type, order, page } = req.query;
  let url = `https://hex-komikmama.vercel.app/api/filter?status=${status || ''}&type=${type || ''}&order=${order || ''}&page=${page || '1'}`;
  
  if (genre) {
    if (Array.isArray(genre)) {
      genre.forEach(g => {
        url += `&genre%5B%5D=${g}`;
      });
    } else {
      url += `&genre%5B%5D=${genre}`;
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`External API returned status ${response.status}`);
    const result = await response.json();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// API Route: /api/chapter
app.get("/api/chapter", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ status: false, message: "URL is required" });
  }

  try {
    const response = await fetch(`https://hex-komikmama.vercel.app/api/chapter?url=${encodeURIComponent(targetUrl)}`);
    
    if (!response.ok) {
      throw new Error(`External API returned status ${response.status}`);
    }

    const rawData: any = await response.json();
    const data = rawData?.data;

    if (!data) {
      throw new Error("Data not found");
    }

    const images = Array.isArray(data) ? data : (data.images || []);
    const title = data.title || "";

    res.json({
      status: true,
      data: {
        title: title,
        images: images
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

export { app };
=======
export { app } from "../api/app.js";
>>>>>>> 76ed31d (update project)
