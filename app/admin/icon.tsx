import { ImageResponse } from "next/og";

// Commissioner pages get their own tab icon so an open /admin is
// distinguishable from the picks page at a glance. The clipboard is a nod to
// Pop-Pop's printouts.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function AdminIcon() {
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
        📋
      </div>
    ),
    size
  );
}
