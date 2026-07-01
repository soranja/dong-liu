import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("./pages/home/index.tsx"),
  route("tracks", "./pages/home/tracks-redirect.tsx"),
  route("tracks/ram-box", "./pages/ram-box/index.tsx"),
  route("*", "./pages/not-found/index.tsx"),
] satisfies RouteConfig;
