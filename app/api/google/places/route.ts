import { NextResponse } from "next/server"

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY

export async function GET(request: Request) {
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Google Maps API key is not configured.",
      },
      { status: 500 },
    )
  }

  const { searchParams } = new URL(request.url)
  const input = searchParams.get("input")
  const placeId = searchParams.get("placeId")

  if (!input && !placeId) {
    return NextResponse.json(
      {
        success: false,
        error: "Provide either an input query or a placeId.",
      },
      { status: 400 },
    )
  }

  try {
    if (input) {
      const endpoint = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json")
      endpoint.searchParams.set("input", input)
      endpoint.searchParams.set("key", apiKey)
      endpoint.searchParams.set("types", "establishment|geocode")

      const response = await fetch(endpoint, { cache: "no-store" })
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Google Places autocomplete failed: ${response.status} ${body}`)
      }
      const data = await response.json()
      return NextResponse.json({
        success: true,
        predictions: data.predictions ?? [],
      })
    }

    if (placeId) {
      const endpoint = new URL("https://maps.googleapis.com/maps/api/place/details/json")
      endpoint.searchParams.set("place_id", placeId)
      endpoint.searchParams.set("key", apiKey)
      endpoint.searchParams.set(
        "fields",
        "name,formatted_address,address_components,geometry/location",
      )

      const response = await fetch(endpoint, { cache: "no-store" })
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Google Places details failed: ${response.status} ${body}`)
      }
      const data = await response.json()
      return NextResponse.json({
        success: true,
        result: data.result ?? null,
      })
    }
  } catch (error) {
    console.error("Google Places API error", error)
    return NextResponse.json(
      {
        success: false,
        error: "Unable to communicate with Google Maps at the moment.",
      },
      { status: 500 },
    )
  }
}


