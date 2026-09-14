import { ImageResponse } from "next/og";

// Browser tab icon. Rendered from the emoji at request time so every browser
// gets a real PNG — SVG favicons are still patchy in Safari, and the family is
// mostly on iPhones.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 52,
          background: "transparent",
        }}
      >
        🏈
      </div>
    ),
    size
  );
}
