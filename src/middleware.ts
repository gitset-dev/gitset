import { defineMiddleware } from "astro/middleware";
import getUser from "@/lib/getUser";

const matchesRoute = (pathname: string, route: string) =>
    pathname === route || pathname.startsWith(`${route}/`);

const PROTECTED_ROUTES = ["/dashboard", "/account"];

export const onRequest = defineMiddleware(async (context, next) => {
    const userInfo = await getUser(context.cookies.get("app_auth_token")?.value);

    context.locals.userId = userInfo?.user?.id?.toString();

    const { pathname } = context.url;

    if (PROTECTED_ROUTES.some((route) => matchesRoute(pathname, route))) {
        if (!userInfo) {
            return context.redirect("/login");
        }
    }

    if (matchesRoute(pathname, "/login")) {
        if (userInfo?.user) {
            return context.redirect("/dashboard");
        }
    }

    const response = await next();

    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("Strict-Transport-Security", "max-age=31536000");

    return response;
});
