import { useState } from "react";
import { Material } from "@/types/material";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, Pencil, ArrowDownCircle, ArrowUpCircle, HandHelping, Undo2, Download, FileSpreadsheet, Trash2, ShoppingCart, CheckCircle, Clock, XCircle } from "lucide-react";
import { ImageDialog } from "@/components/ImageDialog";
import { MaterialsFilter } from "@/components/MaterialsFilter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MaterialsTableProps {
  materials: Material[];
  onViewLocation: (material: Material) => void;
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
  onQuickAction?: (material: Material, action: "entrada" | "saida" | "emprestimo" | "devolucao") => void;
  onTogglePurchase?: (material: Material, newStatus: "pendente" | "em_cotacao" | "comprado") => void;
  onToggleObsolete?: (material: Material) => void;
  onAddToCart?: (material: Material) => void;
  tipo: "estoque" | "emprestimo" | "consumivel";
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  onClearFilters: () => void;
  userRole?: "admin" | "compras" | "diretor" | "almoxarife" | "financeiro" | null;
}

export function MaterialsTable({ 
  materials, 
  onViewLocation, 
  onEdit, 
  onDelete,
  onQuickAction,
  onTogglePurchase,
  onToggleObsolete,
  onAddToCart,
  tipo,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  locationFilter,
  onLocationFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onClearFilters,
  userRole
}: MaterialsTableProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const uniqueLocations = Array.from(new Set(materials.map((m) => m.localizacao))).sort();
  const uniqueCategories = Array.from(new Set(materials.map((m) => m.categoria).filter(Boolean))).sort() as string[];

  const getStockStatus = (material: Material) => {
    // Materiais obsoletos não geram alerta
    if (material.obsoleto) {
      return { label: "Obsoleto", variant: "secondary" as const };
    }
    // Consumíveis mostram apenas "Consumível" sem status de estoque
    if (material.tipo === "consumivel") {
      return { label: "Consumível", variant: "outline" as const };
    }
    if (material.quantidadeAtual <= material.estoqueMinimo) {
      return { label: "Crítico", variant: "destructive" as const };
    }
    if (material.quantidadeAtual <= material.estoqueMinimo * 1.5) {
      return { label: "Baixo", variant: "warning" as const };
    }
    return { label: "Normal", variant: "success" as const };
  };

  const filteredMaterials = materials.filter((material) => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (
        !material.codigo.toLowerCase().includes(searchLower) &&
        !material.descricao.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all") {
      const status = getStockStatus(material);
      if (statusFilter === "critical" && status.variant !== "destructive") return false;
      if (statusFilter === "low" && status.variant !== "warning") return false;
      if (statusFilter === "normal" && status.variant !== "success") return false;
    }

    // Location filter
    if (locationFilter !== "all" && material.localizacao !== locationFilter) {
      return false;
    }

    // Category filter
    if (categoryFilter !== "all" && material.categoria !== categoryFilter) {
      return false;
    }

    return true;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(tipo === "estoque" ? "Materiais de Estoque" : "Materiais de Empréstimo", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);
    
    const tableData = filteredMaterials.map((material) => {
      const status = getStockStatus(material);
      const valorTotal = material.valorUnitario 
        ? (material.valorUnitario * material.quantidadeAtual).toFixed(2)
        : "-";
      return [
        material.codigo,
        material.descricao,
        material.categoria || "-",
        `${material.quantidadeAtual} ${material.unidadeMedida}`,
        material.estoqueMinimo.toString(),
        material.estoqueMaximo?.toString() || "-",
        status.label,
        material.valorUnitario ? `R$ ${material.valorUnitario.toFixed(2)}` : "-",
        material.valorUnitario ? `R$ ${valorTotal}` : "-"
      ];
    });

    autoTable(doc, {
      head: [["Código", "Descrição", "Categoria", "Qtd", "Mín", "Máx", "Status", "Valor Unit.", "Valor Total"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    const totalValue = filteredMaterials.reduce((sum, m) => {
      if (m.valorUnitario) {
        return sum + (m.valorUnitario * m.quantidadeAtual);
      }
      return sum;
    }, 0);

    if (totalValue > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 35;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Valor Total em Estoque: R$ ${totalValue.toFixed(2)}`, 14, finalY + 10);
    }

    doc.save(`${tipo === "estoque" ? "materiais_estoque" : "materiais_emprestimo"}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const excelData = filteredMaterials.map((material) => {
      const status = getStockStatus(material);
      const valorTotal = material.valorUnitario 
        ? (material.valorUnitario * material.quantidadeAtual).toFixed(2)
        : "";
      return {
        "Código": material.codigo,
        "Descrição": material.descricao,
        "Categoria": material.categoria || "",
        "Quantidade": material.quantidadeAtual,
        "Unidade": material.unidadeMedida,
        "Mínimo": material.estoqueMinimo,
        "Máximo": material.estoqueMaximo || "",
        "Status": status.label,
        "Valor Unitário": material.valorUnitario ? material.valorUnitario.toFixed(2) : "",
        "Valor Total": valorTotal,
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tipo === "estoque" ? "Estoque" : "Empréstimo");
    
    XLSX.writeFile(wb, `${tipo === "estoque" ? "materiais_estoque" : "materiais_emprestimo"}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <MaterialsFilter
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        locationFilter={locationFilter}
        onLocationFilterChange={onLocationFilterChange}
        locations={uniqueLocations}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
        categories={uniqueCategories}
        onClearFilters={onClearFilters}
      />

      <div className="flex justify-end gap-2">
        <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
        <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Excel</span>
          <span className="sm:hidden">Excel</span>
        </Button>
      </div>
      
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 sm:w-20">Foto</TableHead>
              <TableHead className="min-w-[80px]">Código</TableHead>
              <TableHead className="min-w-[150px]">Descrição</TableHead>
              <TableHead className="hidden lg:table-cell">Categoria</TableHead>
              <TableHead className="text-center min-w-[100px]">Qtd.</TableHead>
              <TableHead className="text-center hidden md:table-cell">Mín.</TableHead>
              <TableHead className="text-center hidden md:table-cell">Máx.</TableHead>
              <TableHead className="text-center hidden md:table-cell text-primary">Comprar</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Valor Unit.</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Valor Total</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Status</TableHead>
              <TableHead className="min-w-[120px]">Local</TableHead>
              <TableHead className="text-center min-w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  {materials.length === 0 
                    ? "Nenhum material cadastrado ainda"
                    : "Nenhum material encontrado com os filtros aplicados"}
                </TableCell>
              </TableRow>
            ) : (
              filteredMaterials.map((material) => {
                const status = getStockStatus(material);
                return (
                  <TableRow key={material.id}>
                    <TableCell>
                      {material.fotoUrl ? (
                        <img 
                          src={material.fotoUrl} 
                          alt={material.descricao}
                          className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage({ url: material.fotoUrl!, alt: material.descricao })}
                          onError={(e) => {
                            e.currentTarget.src = "https://via.placeholder.com/48?text=Sem+Foto";
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          <span className="hidden sm:inline text-xs">Sem foto</span>
                          <span className="sm:hidden">-</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-xs sm:text-sm">{material.codigo}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{material.descricao}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {material.categoria ? (
                        <Badge variant="outline" className="text-xs">{material.categoria}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs sm:text-sm">
                      {material.tipo === "consumivel" ? (
                        <span className="text-primary" title="Quantidade infinita">∞</span>
                      ) : (
                        <>{material.quantidadeAtual} <span className="hidden sm:inline">{material.unidadeMedida}</span></>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs hidden md:table-cell">
                      {material.tipo === "consumivel" ? "-" : material.estoqueMinimo}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs hidden md:table-cell">
                      {material.tipo === "consumivel" ? "-" : material.estoqueMaximo || "-"}
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      {material.tipo === "consumivel" ? (
                        "-"
                      ) : material.estoqueMaximo && material.estoqueMaximo > material.quantidadeAtual ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-semibold text-primary text-xs">
                            {material.estoqueMaximo - material.quantidadeAtual}
                          </span>
                          {onAddToCart && (status.variant === "destructive" || status.variant === "warning") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddToCart(material)}
                              className="h-6 w-6 p-0 hover:bg-primary/10"
                              title={`Adicionar ${material.estoqueMaximo - material.quantidadeAtual} unidades ao pedido de compra`}
                            >
                              <ShoppingCart className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-xs hidden lg:table-cell">
                      {material.valorUnitario ? `R$ ${material.valorUnitario.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs hidden lg:table-cell">
                      {material.valorUnitario 
                        ? `R$ ${(material.valorUnitario * material.quantidadeAtual).toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <Badge variant={status.variant} className="text-xs">
                        {status.variant === "destructive" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewLocation(material)}
                          className="gap-1 justify-start text-xs h-7 px-2"
                        >
                          <MapPin className="h-3 w-3" />
                          <span className="hidden sm:inline">{material.localizacao}</span>
                          <span className="sm:hidden">{material.localizacao.slice(0, 8)}...</span>
                        </Button>
                        {onQuickAction && userRole !== "diretor" && userRole !== "compras" && (
                          <div className="flex gap-1">
                            {material.tipo === "estoque" ? (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "entrada")}
                                  title="Entrada rápida"
                                  className="flex-1 h-6 px-1"
                                >
                                  <ArrowDownCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "saida")}
                                  title="Saída rápida"
                                  className="flex-1 h-6 px-1"
                                >
                                  <ArrowUpCircle className="h-3 w-3" />
                                </Button>
                              </>
                            ) : material.tipo === "consumivel" ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onQuickAction(material, "saida")}
                                title="Saída rápida"
                                className="w-full h-6 px-1"
                              >
                                <ArrowUpCircle className="h-3 w-3" />
                                <span className="hidden sm:inline text-xs ml-1">Saída</span>
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "emprestimo")}
                                  title="Empréstimo rápido"
                                  className="flex-1 h-6 px-1"
                                >
                                  <HandHelping className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => onQuickAction(material, "devolucao")}
                                  title="Devolução rápida"
                                  className="flex-1 h-6 px-1"
                                >
                                  <Undo2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 flex-col">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(material)}
                            className="gap-1 h-7 px-2 flex-1"
                            disabled={userRole === "diretor" || userRole === "compras"}
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="hidden sm:inline text-xs">Editar</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete(material)}
                            className="gap-1 h-7 px-2 flex-1"
                            disabled={userRole === "diretor" || userRole === "compras"}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline text-xs">Excluir</span>
                          </Button>
                        </div>
                        {userRole === "admin" && onToggleObsolete && (
                          <Button
                            variant={material.obsoleto ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => onToggleObsolete(material)}
                            className="gap-1 h-7 px-2 w-full"
                            title={material.obsoleto ? "Remover de obsoleto" : "Marcar como obsoleto"}
                          >
                            <XCircle className="h-3 w-3" />
                            <span className="text-xs">
                              {material.obsoleto ? "Ativar" : "Obsoleto"}
                            </span>
                          </Button>
                        )}
                        {(userRole === "admin" || userRole === "compras") && onTogglePurchase && !material.obsoleto && (
                          <div className="flex gap-1">
                            <Button
                              variant={material.statusCompra === "pendente" ? "default" : "outline"}
                              size="sm"
                              onClick={() => onTogglePurchase(material, "pendente")}
                              className="gap-1 h-7 px-2 flex-1"
                              title="Marcar como pendente"
                            >
                              <ShoppingCart className="h-3 w-3" />
                              <span className="hidden lg:inline text-xs">Pendente</span>
                            </Button>
                            <Button
                              variant={material.statusCompra === "em_cotacao" ? "default" : "outline"}
                              size="sm"
                              onClick={() => onTogglePurchase(material, "em_cotacao")}
                              className="gap-1 h-7 px-2 flex-1"
                              title="Marcar como em cotação"
                            >
                              <Clock className="h-3 w-3" />
                              <span className="hidden lg:inline text-xs">Cotação</span>
                            </Button>
                            <Button
                              variant={material.statusCompra === "comprado" ? "success" : "outline"}
                              size="sm"
                              onClick={() => onTogglePurchase(material, "comprado")}
                              className="gap-1 h-7 px-2 flex-1"
                              title="Marcar como comprado"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span className="hidden lg:inline text-xs">Comprado</span>
                            </Button>
                          </div>
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
      
      {selectedImage && (
        <ImageDialog
          imageUrl={selectedImage.url}
          alt={selectedImage.alt}
          open={!!selectedImage}
          onOpenChange={(open) => !open && setSelectedImage(null)}
        />
      )}
    </div>
  );
}
