import type { Metadata } from "next";
import { Finder } from "@/components/finder";

export const metadata: Metadata = {
  title: "Find the hiring team",
};

export default async function FindPage(props: PageProps<"/find">) {
  const searchParams = await props.searchParams;
  const url = typeof searchParams.url === "string" ? searchParams.url : "";
  return <Finder initialUrl={url} startManual={searchParams.manual === "1"} />;
}
