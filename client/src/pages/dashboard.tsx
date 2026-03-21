import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Bot, Zap, Layers } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Nebulosa</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/spark">
              <Button variant="ghost" className="gap-2">
                <Zap className="h-4 w-4" />
                Spark
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Telegram-first sticker &amp; emoji platform
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight">
          Create magic with{" "}
          <span className="text-primary">Nebulosa</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Build stunning emoji packs, manage sticker collections, and power your
          Telegram community — all from one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/spark">
            <Button size="lg" className="gap-2">
              <Zap className="h-5 w-5" />
              Go to Spark
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="container mx-auto px-6 pb-20 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Spark</CardTitle>
            <CardDescription>
              Your project hub — find, browse, and manage all your emoji packs
              and creative projects in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/spark">
              <Button variant="outline" className="w-full">
                Open Spark
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Bot className="h-8 w-8 text-secondary mb-2" />
            <CardTitle>Bot</CardTitle>
            <CardDescription>
              Telegram bot integration with real-time metrics, command logs, and
              Zoom meeting insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Layers className="h-8 w-8 text-accent mb-2" />
            <CardTitle>Collections</CardTitle>
            <CardDescription>
              Organise sticker drafts into curated collections and share them
              with your audience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
