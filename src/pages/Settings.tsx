import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ArrowLeft, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const { isAdmin, loading } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessRequests, setAccessRequests] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadAccessRequests();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, nome")
      .order("email");

    if (error) {
      console.error("Error loading users:", error);
    } else {
      setUsers(data || []);
    }
  };

  const loadAccessRequests = async () => {
    const { data, error } = await supabase
      .from("access_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading access requests:", error);
    } else {
      setAccessRequests(data || []);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso!",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleApproveRequest = async (request: any) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: request.user_email,
        password: Math.random().toString(36).slice(-12),
        options: { emailRedirectTo: `${window.location.origin}/` }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: request.requested_role });

        if (roleError) throw roleError;

        const { error: updateError } = await supabase
          .from("access_requests")
          .update({ 
            status: "approved", 
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString()
          })
          .eq("id", request.id);

        if (updateError) throw updateError;

        toast({
          title: "Solicitação aprovada",
          description: `Acesso concedido para ${request.user_email}`,
        });

        loadUsers();
        loadAccessRequests();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (request: any) => {
    try {
      const { error } = await supabase
        .from("access_requests")
        .update({ 
          status: "rejected", 
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Solicitação rejeitada",
        description: `Acesso negado para ${request.user_email}`,
      });

      loadAccessRequests();
    } catch (error: any) {
      toast({
        title: "Erro ao rejeitar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Configurações</h1>
        </div>

        <Tabs defaultValue="password" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
            <TabsTrigger value="password">Senha</TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="requests">Solicitações ({accessRequests.length})</TabsTrigger>
                <TabsTrigger value="users">Usuários</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="password">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Alterar Senha</h2>
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Suas Credenciais de Acesso</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Login (Email):</span> {user?.email}</p>
                  <p className="text-muted-foreground">Use estas credenciais para fazer login no sistema</p>
                </div>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Alterar Senha</Button>
              </form>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="requests">
              <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Solicitações de Acesso</h2>
              <div className="space-y-3">
                {accessRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhuma solicitação pendente</p>
                ) : (
                  accessRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded">
                      <div>
                        <p className="font-medium">{request.user_email}</p>
                         <Badge variant="outline" className="mt-1">
                           {request.requested_role === "admin" ? "Admin" :
                            request.requested_role === "almoxarife" ? "Almoxarife" :
                            request.requested_role === "compras" ? "Compras" : "Diretoria"}
                         </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApproveRequest(request)}>
                          <Check className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(request)}>
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="users">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Usuários Cadastrados</h2>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.nome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
