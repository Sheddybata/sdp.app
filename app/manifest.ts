import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SDP Registration Gateway",
    short_name: "SDP Gateway",
    description: "Social Democratic Party - Registration, verification, and member services",
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
        url: "/enroll/new",
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
