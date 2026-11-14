import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const year = request.nextUrl.searchParams.get("year") ?? "2023";

  if (!["2021", "2022", "2023"].includes(year)) {
    return NextResponse.json(
      { error: "Unsupported year" },
      { status: 400 }
    );
  }

  const apiUrl = (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/accidents/tamil-nadu/districts?year=${year}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "District data unavailable" },
        { status: 502 }
      );
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to accident API" },
      { status: 502 }
    );
  }
}
