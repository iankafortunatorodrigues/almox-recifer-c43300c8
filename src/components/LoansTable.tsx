import { useState } from "react";
import { Movimentacao, Material } from "@/types/material";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandHelping, Undo2, Download, Edit, Trash2 } from "lucide-react";
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
  onEdit: (loan: Movimentacao) => void;
  onDelete: (loan: Movimentacao) => void;
  userRole?: string | null;
}

export function LoansTable({ loans, materials, onReturn, onEdit, onDelete, userRole }: LoansTableProps) {
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
        <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      </div>
      
    
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 sm:w-20">Foto</TableHead>
            <TableHead className="min-w-[150px]">Material</TableHead>
            <TableHead className="text-center">Qtd.</TableHead>
            <TableHead className="min-w-[120px]">Responsável</TableHead>
            <TableHead className="hidden md:table-cell">Data Empréstimo</TableHead>
            <TableHead className="text-center">Dias</TableHead>
            <TableHead className="hidden lg:table-cell">Observação</TableHead>
            <TableHead className="text-center min-w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLoans.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                {loans.length === 0 
                  ? "Nenhum empréstimo ativo no momento"
                  : "Nenhum empréstimo encontrado com os filtros aplicados"}
              </TableCell>
            </TableRow>
          ) : (
            filteredLoans.map((loan) => {
              const daysLoaned = getDaysLoaned(loan.data);
              const material = materials.find((m) => m.id === loan.materialId);
              const canEdit = userRole === "admin";
              return (
                <TableRow key={loan.id}>
                  <TableCell>
                    {loan.fotoUrl ? (
                      <img 
                        src={loan.fotoUrl} 
                        alt="Material"
                        className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/48?text=Sem+Foto";
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-muted rounded flex items-center justify-center">
                        <span className="hidden sm:inline text-xs text-muted-foreground">Sem foto</span>
                        <span className="sm:hidden text-xs">-</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-xs sm:text-sm">{getMaterialName(loan.materialId)}</TableCell>
                  <TableCell className="text-center font-semibold text-xs sm:text-sm">{loan.quantidade}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{loan.responsavel}</TableCell>
                  <TableCell className="text-xs sm:text-sm hidden md:table-cell">{formatDate(loan.data)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={daysLoaned > 7 ? "destructive" : daysLoaned > 3 ? "warning" : "default"} className="text-xs">
                      {daysLoaned}<span className="hidden sm:inline"> {daysLoaned === 1 ? "dia" : "dias"}</span><span className="sm:hidden">d</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs sm:text-sm hidden lg:table-cell">
                    {loan.observacao || "-"}
                  </TableCell>
                   <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      {userRole !== "diretor" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReturn(loan)}
                          className="gap-1 h-7 px-2"
                        >
                          <Undo2 className="h-3 w-3" />
                          <span className="hidden sm:inline text-xs">Devolver</span>
                        </Button>
                      )}
                      {canEdit && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(loan)}
                            className="gap-1 h-7 px-2"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(loan)}
                            className="gap-1 h-7 px-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
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
