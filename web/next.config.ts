import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/drops",     destination: "/campaigns",    permanent: true },
      { source: "/drops/:id", destination: "/campaigns/:id", permanent: true },
      { source: "/quests",    destination: "/campaigns",    permanent: true },
      { source: "/partner",   destination: "/projects",     permanent: true },
      { source: "/partner/new", destination: "/projects",   permanent: true },
      { source: "/activity",  destination: "/",             permanent: true },
      { source: "/calendar",  destination: "/",             permanent: true },
    ];
  },
};

export default nextConfig;
