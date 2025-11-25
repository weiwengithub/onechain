import { useRef, useEffect, useState } from "react";
import QRCodeStyling from "qr-code-styling";

interface QRCodeProps {
  data: string; // qrcode data
  width?: number;
  height?: number;
  image?: string;
}

export const QRCode = ({ data, width = 220, height = 220, image = "" }: QRCodeProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [qrCode] = useState(
    () =>
      new QRCodeStyling({
        width,
        height,
        data,
        image,
        dotsOptions: {
          type: "dots",
          color: "#000000",
        },
        cornersDotOptions: {
          type: "dot",
        },
        cornersSquareOptions: {
          type: "dot",
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        imageOptions: {
          crossOrigin: "anonymous",
        },
      }),
  );

  useEffect(() => {
    if (ref.current) {
      qrCode.append(ref.current);
    }
    return () => {
      if (ref.current) {
        ref.current.innerHTML = "";
      }
    };
  }, [qrCode]);

  // update qrcode
  useEffect(() => {
    qrCode.update({
      data,
      width,
      height,
    });
  }, [data, width, height, qrCode]);

  return (
    <div
      ref={ref}
      className={"flex items-center justify-center"}
    />
  );
};
