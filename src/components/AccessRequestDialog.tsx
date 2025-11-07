import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface AccessRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccessRequestDialog({ open, onOpenChange }: AccessRequestDialogProps) {
  const [email, setEmail] = useState("");
  const [requestedRole, setRequestedRole] = useState<"admin" | "compras" | "diretor" | "almoxarife">("almoxarife");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Por favor, preencha o email");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("access_requests")
        .insert({
          user_email: email,
          requested_role: requestedRole
        });

      if (error) throw error;

      toast.success("Solicitação enviada com sucesso! Aguarde a aprovação do administrador.");
      setEmail("");
      setRequestedRole("almoxarife");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao enviar solicitação: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Solicitar Acesso
          </DialogTitle>
          <DialogDescription>
            Solicite acesso ao sistema. O administrador receberá sua solicitação e poderá aprová-la.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Tipo de Acesso</Label>
            <Select value={requestedRole} onValueChange={(value: any) => setRequestedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="almoxarife">Almoxarife (acesso total)</SelectItem>
                <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                <SelectItem value="compras">Compras (gerenciar compras)</SelectItem>
                <SelectItem value="diretor">Diretoria (apenas visualização)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Solicitar Acesso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
