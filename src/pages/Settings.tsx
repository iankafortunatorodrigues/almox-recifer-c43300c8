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
import { ArrowLeft, Check, X, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
  const { isAdmin, loading } = useUserRole();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  
  // New user form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserNome, setNewUserNome] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [passwordChanges, setPasswordChanges] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadAccessRequests();
      loadPasswordChanges();
    }
  }, [isAdmin]);

  const loadPasswordChanges = async () => {
    const { data, error } = await supabase
      .from("password_changes")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading password changes:", error);
    } else {
      setPasswordChanges(data || []);
    }
  };

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

      // Registrar alteração de senha para o admin ver
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user?.id)
        .single();

      await supabase.from("password_changes").insert({
        user_id: user?.id,
        user_email: user?.email || "",
        user_nome: profileData?.nome || user?.email
      });

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserPassword || !newUserRole) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 8) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 8 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingUser(true);

    try {
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          nome: newUserNome || newUserEmail
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "Usuário criado",
        description: `Usuário ${newUserEmail} criado com sucesso!`,
      });

      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserNome("");
      setNewUserRole("");
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleApproveRequest = async (request: any) => {
    setIsCreatingUser(true);
    
    try {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
      
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: request.user_email,
          password: tempPassword,
          role: request.requested_role,
          nome: request.user_email
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Update request status
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
        description: `Acesso concedido para ${request.user_email}. Senha temporária: ${tempPassword}`,
      });

      loadUsers();
      loadAccessRequests();
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingUser(false);
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
          <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
        </div>

        <Tabs defaultValue="password" className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-1'}`}>
            <TabsTrigger value="password" className="text-xs sm:text-sm">Senha</TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="create-user" className="text-xs sm:text-sm">Cadastrar</TabsTrigger>
                <TabsTrigger value="requests" className="text-xs sm:text-sm">Solicitações ({accessRequests.length})</TabsTrigger>
                <TabsTrigger value="users" className="text-xs sm:text-sm">Usuários</TabsTrigger>
                <TabsTrigger value="password-logs" className="text-xs sm:text-sm">Logs Senha</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="password">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Alterar Senha</h2>
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
            <TabsContent value="create-user">
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Cadastrar Novo Usuário
                </h2>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userNome">Nome</Label>
                    <Input
                      id="userNome"
                      type="text"
                      value={newUserNome}
                      onChange={(e) => setNewUserNome(e.target.value)}
                      placeholder="Nome do usuário"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userEmail">Email *</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPassword">Senha *</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userRole">Função *</Label>
                    <Select value={newUserRole} onValueChange={setNewUserRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="almoxarife">Almoxarife</SelectItem>
                        <SelectItem value="compras">Compras</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="diretor">Diretoria</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreatingUser}>
                    {isCreatingUser ? "Criando..." : "Cadastrar Usuário"}
                  </Button>
                </form>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="requests">
              <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Solicitações de Acesso</h2>
              <div className="space-y-3">
                {accessRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhuma solicitação pendente</p>
                ) : (
                  accessRequests.map((request) => (
                    <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded gap-3">
                      <div>
                        <p className="font-medium text-sm sm:text-base">{request.user_email}</p>
                         <Badge variant="outline" className="mt-1">
                           {request.requested_role === "admin" ? "Admin" :
                            request.requested_role === "almoxarife" ? "Almoxarife" :
                            request.requested_role === "compras" ? "Compras" :
                            request.requested_role === "financeiro" ? "Financeiro" : "Diretoria"}
                         </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApproveRequest(request)} disabled={isCreatingUser}>
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
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Usuários Cadastrados</h2>
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium text-sm sm:text-base">{u.email}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{u.nome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="password-logs">
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">Alterações de Senha</h2>
                <div className="space-y-2">
                  {passwordChanges.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Nenhuma alteração de senha registrada</p>
                  ) : (
                    passwordChanges.map((change) => (
                      <div key={change.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded gap-2">
                        <div>
                          <p className="font-medium text-sm sm:text-base">{change.user_nome || change.user_email}</p>
                          <p className="text-xs text-muted-foreground">{change.user_email}</p>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(change.changed_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
