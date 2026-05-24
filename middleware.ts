export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/documents/:path*",
    "/upload/:path*",
    "/companies/:path*",
    "/ocr-review/:path*",
    "/admin/:path*",
    "/logs/:path*",
    "/exports/:path*",
  ],
};
