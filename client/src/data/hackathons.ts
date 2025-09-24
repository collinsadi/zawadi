import type { Hackathon } from "../types/Hackathon";

export const hackathons: Hackathon[] = [
  {
    id: "zk-innovators-2025",
    title: "ZK Innovators Hackathon 2025",
    cover:
      "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2200&auto=format&fit=crop",
    description:
      "Push the boundaries of privacy and cryptography with cutting-edge ZK applications.",
    details: {
      prizePool: "150000",
      currency: "USD",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      location: "Global / Online",
      tags: ["ZK", "Cryptography", "Privacy"],
    },
    organiser: {
      name: "Zawadi Foundation",
      logo: "https://api.dicebear.com/9.x/shapes/svg?seed=zawadi",
      url: "https://zawadi.xyz",
    },
  },
  {
    id: "ai-web3-builders",
    title: "AI x Web3 Builders Sprint",
    cover:
      "https://images.unsplash.com/photo-1504639725590-34d0984388bd?q=80&w=2200&auto=format&fit=crop",
    description:
      "Experiment with AI agents, DeFi intelligence, and autonomous protocols.",
    details: {
      prizePool: "80000",
      currency: "USD",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
      location: "San Francisco, CA",
      tags: ["AI", "DeFi", "Agents"],
    },
    organiser: {
      name: "Builders Guild",
      logo: "https://api.dicebear.com/9.x/shapes/svg?seed=builders",
      url: "https://guild.example.com",
    },
  },
  {
    id: "l2-scaling-hack",
    title: "Layer 2 Scaling Hack",
    cover:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2200&auto=format&fit=crop",
    description:
      "Unlock the next generation of throughput with L2 infra and rollups.",
    details: {
      prizePool: "50000",
      currency: "USD",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
      location: "Berlin, Germany",
      tags: ["L2", "Rollups", "Infra"],
    },
    organiser: {
      name: "L2 Alliance",
      logo: "https://api.dicebear.com/9.x/shapes/svg?seed=l2",
      url: "https://l2alliance.example.com",
    },
  },
  {
    id: "open-source-impact-week",
    title: "Open Source Impact Week",
    cover:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2200&auto=format&fit=crop",
    description:
      "Build public goods and open-source tooling that helps the whole ecosystem.",
    details: {
      prizePool: "20000",
      currency: "USD",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
      location: "Remote",
      tags: ["OSS", "Public Goods"],
    },
    organiser: {
      name: "Open Builders",
      logo: "https://api.dicebear.com/9.x/shapes/svg?seed=open",
      url: "https://open.builders.example.com",
    },
  },
];
