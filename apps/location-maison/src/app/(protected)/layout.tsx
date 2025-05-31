import Navbar from "@/components/home-page/Navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen'>
      <Navbar />
      {children}
    </div>
  );
}