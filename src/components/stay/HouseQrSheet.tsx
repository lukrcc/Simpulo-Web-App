"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { downloadQrPng, SimpuloQR } from "@/components/SimpuloQR";
import { Button } from "@/components/ui/ActionButton";
import { Sheet } from "@/components/ui/Sheet";
import { houseLink } from "@/lib/links";
import type { Stay } from "@/lib/types";

const QR_SIZE = 240;

/** "Show QR code" from the House page's "…": the House title, its QR code (/h/{slug}?ref=house-qr) and "Download PNG". */
export function HouseQrSheet({ stay, open, onClose }: { stay: Stay; open: boolean; onClose: () => void }) {
  const t = useTranslations("install");
  const svg = useRef<SVGSVGElement>(null);
  return (
    <Sheet open={open} onClose={onClose} title={stay.title}>
      <div className="flex flex-col items-center gap-3">
        <SimpuloQR url={houseLink(stay.slug)} refParam="house-qr" size={QR_SIZE} svgRef={svg} />
        <p className="text-small text-muted">{t("qrHint")}</p>
      </div>
      <div className="mt-8 flex justify-end">
        <Button
          variant="primary"
          onClick={() => {
            if (svg.current) void downloadQrPng(svg.current, `simpulo-${stay.slug}-qr.png`, QR_SIZE * 4);
          }}
        >
          <Download aria-hidden />
          {t("qrDownload")}
        </Button>
      </div>
    </Sheet>
  );
}
