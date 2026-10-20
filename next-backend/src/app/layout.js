import "./globals.css";

export const metadata = {
  title: "Online Course Service API",
  description: "Next.js backend for the Online Course Service.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
