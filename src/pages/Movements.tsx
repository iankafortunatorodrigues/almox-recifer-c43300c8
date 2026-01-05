import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDownCircle, ArrowUpCircle, HandHelping, Undo2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { MovementsFilter } from "@/components/MovementsFilter";

interface DbMovement {
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

export default function Movements() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [responsavelFilter, setResponsavelFilter] = useState("");

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*, materials(descricao, codigo)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbMovement[];
    },
  });

  const responsaveis = useMemo(() => {
    const unique = [...new Set(movements.map((m) => m.responsavel))];
    return unique.sort();
  }, [movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      const matchesSearch =
        !searchQuery ||
        mov.materials?.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mov.materials?.codigo.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTipo = !tipoFilter || tipoFilter === "all" || mov.tipo === tipoFilter;
      const matchesResponsavel =
        !responsavelFilter || responsavelFilter === "all" || mov.responsavel === responsavelFilter;

      return matchesSearch && matchesTipo && matchesResponsavel;
    });
  }, [movements, searchQuery, tipoFilter, responsavelFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setTipoFilter("");
    setResponsavelFilter("");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMovementIcon = (tipo: string) => {
    switch (tipo) {
      case "entrada": return <ArrowDownCircle className="h-3 w-3" />;
      case "saida": return <ArrowUpCircle className="h-3 w-3" />;
      case "emprestimo": return <HandHelping className="h-3 w-3" />;
      case "devolucao": return <Undo2 className="h-3 w-3" />;
      default: return null;
    }
  };

  const getMovementVariant = (tipo: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (tipo) {
      case "entrada": return "default";
      case "saida": return "destructive";
      case "emprestimo": return "secondary";
      case "devolucao": return "outline";
      default: return "default";
    }
  };

  return (
    <DashboardLayout
      title="Movimentações"
      subtitle="Histórico de entradas e saídas"
    >
      <div className="space-y-4">
        <MovementsFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          tipoFilter={tipoFilter}
          onTipoChange={setTipoFilter}
          responsavelFilter={responsavelFilter}
          onResponsavelChange={setResponsavelFilter}
          responsaveis={responsaveis}
          onClearFilters={clearFilters}
        />

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
                    <TableHead>OBSERVAÇÃO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>{formatDate(mov.data || mov.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={getMovementVariant(mov.tipo)} className="gap-1">
                        {getMovementIcon(mov.tipo)}
                        {mov.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mov.materials 
                        ? `${mov.materials.codigo} - ${mov.materials.descricao}`
                        : "-"
                      }
                    </TableCell>
                    <TableCell>{mov.quantidade}</TableCell>
                    <TableCell>{mov.responsavel}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{mov.observacao || "-"}</TableCell>
                  </TableRow>
                ))}
                  {filteredMovements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma movimentação encontrada
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
