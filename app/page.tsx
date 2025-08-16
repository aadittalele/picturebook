import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import AuthButton from "@/components/AuthButton";
import Logo from "@/components/Logo";
import { BookOpen, Sparkles, Download } from "lucide-react";
import Footer from "@/components/Footer";

export default async function Home() {
  let user = null;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isSupabaseConfigured = supabaseUrl;
  
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (error) {
      console.warn('Supabase not configured properly:', error);
    }
  }

  return (<>
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <Logo />
        <AuthButton user={user} />
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-6xl font-bold mb-6 text-black transform -rotate-1">
            Create Magical
            <br />
            <span className="bg-yellow-300 px-4 py-2 inline-block transform rotate-1">
              Picture Books
            </span>
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto font-medium">
            Transform your stories into beautiful, interactive picture books with AI-generated illustrations. 
            Perfect for kids, teachers, and storytellers!
          </p>
          
          <div className="flex gap-4 justify-center">
            {user ? (
              <Link href="/dashboard" className="neo-btn neo-primary text-lg">
                Go to Dashboard
              </Link>
            ) : (
              null
            )}
            <Link href="/books" className="neo-btn text-lg">
              Browse Public Books
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="neo-card text-center transform rotate-1">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
            <h3 className="text-xl font-bold mb-2">AI-Generated Images</h3>
            <p className="text-gray-700">
              Bring your stories to life with beautiful AI-generated illustrations that match your narrative perfectly.
            </p>
          </div>
          
          <div className="neo-card text-center transform -rotate-1">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <h3 className="text-xl font-bold mb-2">Interactive Editor</h3>
            <p className="text-gray-700">
              Easy-to-use editor for creating and customizing your picture book pages with text and images.
            </p>
          </div>
          
          <div className="neo-card text-center transform rotate-1">
            <Download className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-xl font-bold mb-2">PDF Export</h3>
            <p className="text-gray-700">
              Download your finished picture book as a high-quality PDF for printing or sharing.
            </p>
          </div>
        </div>

        {/* How it Works
        <div className="neo-card max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-8 transform -rotate-1">How It Works</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xl font-bold mb-4 bg-yellow-200 px-4 py-2 inline-block transform rotate-1">
                Option 1: From Text
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-lg">
                <li>Write or paste your story</li>
                <li>AI breaks it into picture book pages</li>
                <li>AI generates beautiful illustrations</li>
                <li>Review, edit, and customize</li>
              </ol>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-4 bg-blue-200 px-4 py-2 inline-block transform -rotate-1">
                Option 2: Blank Template
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-lg">
                <li>Start with blank pages</li>
                <li>Add your own text and descriptions</li>
                <li>Upload images or generate with AI</li>
                <li>Arrange and customize layouts</li>
              </ol>
            </div>
          </div>
        </div> */}
      </main>
    </div>
    <Footer />
  </>);
}
