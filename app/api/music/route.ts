import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      console.error("[music] Missing Spotify env vars");
      return NextResponse.json({ errorCode: "NOT_CONFIGURED" }, { status: 500 });
    }

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenRes.ok) {
      console.error("[music] Spotify token refresh failed:", tokenRes.status, await tokenRes.text());
      return NextResponse.json({ errorCode: "AUTH_FAILED" }, { status: 500 });
    }

    const { access_token } = await tokenRes.json();

    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (res.status === 204 || res.status === 404) {
      return NextResponse.json({ playing: false });
    }

    if (!res.ok) {
      console.error("[music] Spotify currently-playing failed:", res.status, await res.text());
      return NextResponse.json({ errorCode: "SPOTIFY_ERROR", message: "error fetching spotify data" }, { status: 500 });
    }

    const data = await res.json();

    if (!data.is_playing || !data.item) {
      return NextResponse.json({ playing: false });
    }

    const track = data.item;
    const artist = track.artists.map((a: { name: string }) => a.name).join(", ");
    const url = track.external_urls?.spotify;

    return NextResponse.json({ playing: true, track: track.name, artist, url });
  } catch (e) {
    console.error("[music] Error:", e);
    return NextResponse.json(
      { errorCode: "INTERNAL_ERROR", message: "internal error fetching music" },
      { status: 500 }
    );
  }
}
