import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DbLoan {
  id: string;
  material_id: string;
  tipo: string;
  quantidade: number;
  data: string | null;
  responsavel: string;
  observacao: string | null;
  created_at: string | null;
  materials?: {
    descricao: string;
    codigo: string;
  };
}

export default function Loans() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*, materials(descricao, codigo)")
        .in("tipo", ["emprestimo", "devolucao"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbLoan[];
    },
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getDaysLoaned = (dateString: string | null) => {
    if (!dateString) return 0;
    const loanDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - loanDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredLoans = loans.filter((loan) => {
    if (searchQuery) {
      const materialName = loan.materials 
        ? `${loan.materials.codigo} - ${loan.materials.descricao}`.toLowerCase()
        : "";
      if (!materialName.includes(searchQuery.toLowerCase()) && 
          !loan.responsavel.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    
    if (statusFilter !== "all" && loan.tipo !== statusFilter) {
      return false;
    }
    
    return true;
  });

  return (
    <DashboardLayout
      title="Empréstimos"
      subtitle="Controle de empréstimos e devoluções"
    >
      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            placeholder="Buscar por material ou responsável..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="emprestimo">Empréstimos</SelectItem>
              <SelectItem value="devolucao">Devoluções</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DATA</TableHead>
                    <TableHead>TIPO</TableHead>
                    <TableHead>MATERIAL</TableHead>
                    <TableHead>QUANTIDADE</TableHead>
                    <TableHead>RESPONSÁVEL</TableHead>
                    <TableHead>DIAS</TableHead>
                    <TableHead>OBSERVAÇÃO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => {
                    const days = getDaysLoaned(loan.data || loan.created_at);
                    return (
                      <TableRow key={loan.id}>
                        <TableCell>{formatDate(loan.data || loan.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={loan.tipo === "emprestimo" ? "secondary" : "default"}>
                            {loan.tipo === "emprestimo" ? "Empréstimo" : "Devolução"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {loan.materials 
                            ? `${loan.materials.codigo} - ${loan.materials.descricao}`
                            : "-"
                          }
                        </TableCell>
                        <TableCell>{loan.quantidade}</TableCell>
                        <TableCell>{loan.responsavel}</TableCell>
                        <TableCell>
                          <Badge variant={days > 7 ? "destructive" : days > 3 ? "secondary" : "outline"}>
                            {days} {days === 1 ? "dia" : "dias"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{loan.observacao || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredLoans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum empréstimo encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
