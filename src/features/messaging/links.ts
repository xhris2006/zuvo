import type { Route } from "next";

export function conversationHref(id: string): Route {
  return `/messages/${id}` as Route;
}
