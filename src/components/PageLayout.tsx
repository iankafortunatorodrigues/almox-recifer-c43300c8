import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
  backPath?: string;
  rightContent?: ReactNode;
  fullWidth?: boolean;
}

export function PageLayout({
  children,
  title,
  showBack = true,
  backPath = "/",
  rightContent,
  fullWidth = false,
}: PageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      {/* Header fixo */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className={`${fullWidth ? 'w-full' : 'container max-w-7xl'} mx-auto px-3 sm:px-4 lg:px-6`}>
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              {showBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(backPath)}
                  className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                {title}
              </h1>
            </div>
            {rightContent && (
              <div className="shrink-0 flex items-center gap-2">
                {rightContent}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className={`${fullWidth ? 'w-full' : 'container max-w-7xl'} mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8`}>
        {children}
      </main>
    </div>
  );
}
