import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  Building2,
  FileBarChart,
  Settings2,
  LogOut,
  Users,
  ClipboardList,
  PackageCheck,
} from "lucide-react";
import logo from "@/assets/logo.jpg";

const menuItems = [
  {
    title: "Almoxarifado",
    description: "Gestão de estoque, materiais e movimentações",
    icon: Package,
    path: "/almoxarifado",
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "Recebimento de Materiais",
    description: "Registro de recebimentos e notas fiscais",
    icon: PackageCheck,
    path: "/recebimentos",
    color: "from-teal-500 to-teal-600",
  },
  {
    title: "Compras e Suprimentos",
    description: "Pedidos de compra, cotações e aprovações",
    icon: ShoppingCart,
    path: "/purchase-orders",
    color: "from-green-500 to-green-600",
  },
  {
    title: "Fornecedores",
    description: "Cadastro e gestão de fornecedores",
    icon: Building2,
    path: "/suppliers",
    color: "from-orange-500 to-orange-600",
  },
  {
    title: "Relatórios",
    description: "Relatórios e análises do sistema",
    icon: FileBarChart,
    path: "/reports",
    color: "from-purple-500 to-purple-600",
  },
  {
    title: "Configurações",
    description: "Configurações do sistema e usuário",
    icon: Settings2,
    path: "/settings",
    color: "from-gray-500 to-gray-600",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-16 w-16 object-contain" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Sistema de Gestão</h1>
                <p className="text-sm text-muted-foreground">
                  {user?.email} • {role || "Usuário"}
                </p>
              </div>
            </div>
            <Button onClick={signOut} variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Sistema</h2>
          <p className="text-muted-foreground">
            Selecione uma opção abaixo para começar
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.path}
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
                onClick={() => navigate(item.path)}
              >
                <div className="p-6">
                  <div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${item.color} mb-4`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
