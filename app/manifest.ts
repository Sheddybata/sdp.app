import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SDP Member Enrollment",
    short_name: "SDP Enroll",
    description: "Social Democratic Party - Frictionless member enrollment PWA",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f48735",
    orientation: "portrait",
    icons: [
      { 
        src: "/icon-192.png", 
        sizes: "192x192", 
        type: "image/png", 
        purpose: "any" 
      },
      { 
        src: "/icon-512.png", 
        sizes: "512x512", 
        type: "image/png", 
        purpose: "any" 
      },
    ],
    categories: ["government", "politics"],
    scope: "/",
    shortcuts: [
      {
        name: "Enroll",
        short_name: "Enroll",
        description: "Enroll as a new member",
        url: "/enroll",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Admin",
        short_name: "Admin",
        description: "Admin dashboard",
        url: "/admin",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
