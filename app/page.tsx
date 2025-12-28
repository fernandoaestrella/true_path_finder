import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero Section */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            🧭 True Path Finder
          </h1>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="btn btn-ghost">
              Sign In
            </Link>
            <Link href="/onboarding" className="btn btn-primary">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-20 text-center">
          <div className="container max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-6">
              Find What <span className="text-[var(--primary)]">Actually Works</span>
            </h2>
            <p className="text-xl text-[var(--text-secondary)] mb-8 leading-relaxed">
              Discover methods to achieve your goals through honest community reviews. 
              No endless debates—just trying, learning, and sharing results.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/onboarding" className="btn btn-primary btn-lg">
                Start Your Journey
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-[var(--surface)]">
          <div className="container">
            <h3 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-12">
              How It Works
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="text-5xl mb-4">🎯</div>
                <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Choose a Goal
                </h4>
                <p className="text-[var(--text-secondary)]">
                  What do you genuinely want to achieve? Browse existing goals or create your own.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-5xl mb-4">🔬</div>
                <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Try Methods
                </h4>
                <p className="text-[var(--text-secondary)]">
                  Discover approaches others have tested. See real reviews from people who tried them.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-5xl mb-4">💬</div>
                <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Share Results
                </h4>
                <p className="text-[var(--text-secondary)]">
                  Write honest reviews. Help others find what works—no endorsements, just truth.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 21 Minute Philosophy */}
        <section className="py-16">
          <div className="container max-w-2xl text-center">
            <div className="timer-bar inline-flex mb-6 text-lg">
              ⏱️ 21:00
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
              21 Minutes of Focus
            </h3>
            <p className="text-[var(--text-secondary)] text-lg">
              The app limits you to 21 minutes per day. This isn&apos;t a limitation—it&apos;s 
              liberation. The goal is to <strong>do the work</strong>, not browse endlessly.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-[var(--primary)] text-white text-center">
          <div className="container max-w-2xl">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Find Your Path?
            </h3>
            <p className="mb-8 opacity-90">
              Join a community focused on genuine progress, not endless discussion.
            </p>
            <Link href="/onboarding" className="btn bg-white text-[var(--primary)] hover:bg-gray-100">
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-[var(--border)]">
        <div className="container text-center text-sm text-[var(--text-muted)]">
          <p>True Path Finder — Goal Achievement Through Community Wisdom</p>
        </div>
      </footer>
    </div>
  );
}
