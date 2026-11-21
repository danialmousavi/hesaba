import localFont from "next/font/local";

export const iranYekan = localFont({
  src: [
    {
      path: "../public/fonts/IRANYekanXFaNum-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-DemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/IRANYekanXFaNum-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
  variable: "--font-iran-yekan",
});

export const modam = localFont({
  src: [
    {
      path: "../public/fonts/Modam-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Modam-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
  variable: "--font-modam",
});
