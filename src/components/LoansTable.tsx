import { useState } from "react";
import { Movimentacao, Material } from "@/types/material";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandHelping, Undo2, Download } from "lucide-react";
import { LoansFilter } from "@/components/LoansFilter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LoansTableProps {
  loans: Movimentacao[];
  materials: Material[];
  onReturn: (loan: Movimentacao) => void;
}

export function LoansTable({ loans, materials, onReturn }: LoansTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [daysFilter, setDaysFilter] = useState("all");

  const getMaterialName = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    return material ? `${material.codigo} - ${material.descricao}` : "Material não encontrado";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysLoaned = (dateString: string) => {
    const loanDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - loanDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const uniqueResponsibles = Array.from(new Set(loans.map((loan) => loan.responsavel))).sort();

  const filteredLoans = loans.filter((loan) => {
    // Search filter
    if (searchQuery) {
      const materialName = getMaterialName(loan.materialId).toLowerCase();
      if (!materialName.includes(searchQuery.toLowerCase())) return false;
    }

    // Responsible filter
    if (responsibleFilter !== "all" && loan.responsavel !== responsibleFilter) {
      return false;
    }

    // Days filter
    if (daysFilter !== "all") {
      const days = getDaysLoaned(loan.data);
      if (daysFilter === "recent" && days > 3) return false;
      if (daysFilter === "medium" && (days <= 3 || days > 7)) return false;
      if (daysFilter === "overdue" && days <= 7) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setResponsibleFilter("all");
    setDaysFilter("all");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Empréstimos Ativos", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);
    
    const tableData = filteredLoans.map((loan) => {
      const daysLoaned = getDaysLoaned(loan.data);
      return [
        getMaterialName(loan.materialId),
        loan.quantidade.toString(),
        loan.responsavel,
        formatDate(loan.data),
        `${daysLoaned} ${daysLoaned === 1 ? "dia" : "dias"}`,
        loan.observacao || "-"
      ];
    });

    autoTable(doc, {
      head: [["Material", "Qtd", "Responsável", "Data Empréstimo", "Dias", "Observação"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    doc.save(`emprestimos_ativos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      <LoansFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        responsibleFilter={responsibleFilter}
        onResponsibleFilterChange={setResponsibleFilter}
        daysFilter={daysFilter}
        onDaysFilterChange={setDaysFilter}
        responsibles={uniqueResponsibles}
        onClearFilters={clearFilters}
      />

      <div className="flex justify-end">
        <Button onClick={exportToPDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>
      
    
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Data Empréstimo</TableHead>
            <TableHead>Dias</TableHead>
            <TableHead>Observação</TableHead>
            <TableHead className="text-center">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLoans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {loans.length === 0 
                  ? "Nenhum empréstimo ativo no momento"
                  : "Nenhum empréstimo encontrado com os filtros aplicados"}
              </TableCell>
            </TableRow>
          ) : (
            filteredLoans.map((loan) => {
              const daysLoaned = getDaysLoaned(loan.data);
              return (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{getMaterialName(loan.materialId)}</TableCell>
                  <TableCell className="text-center font-semibold">{loan.quantidade}</TableCell>
                  <TableCell>{loan.responsavel}</TableCell>
                  <TableCell className="text-sm">{formatDate(loan.data)}</TableCell>
                  <TableCell>
                    <Badge variant={daysLoaned > 7 ? "destructive" : daysLoaned > 3 ? "warning" : "default"}>
                      {daysLoaned} {daysLoaned === 1 ? "dia" : "dias"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {loan.observacao || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReturn(loan)}
                      className="gap-2"
                    >
                      <Undo2 className="h-4 w-4" />
                      Devolver
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
