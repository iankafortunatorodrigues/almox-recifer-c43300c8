import { useState } from "react";
import { Movimentacao, Material } from "@/types/material";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Trash2, Download, HandHelping, Undo2 } from "lucide-react";
import { ImageDialog } from "@/components/ImageDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface HistoryTableProps {
  movements: Movimentacao[];
  materials: Material[];
  onEdit?: (movement: Movimentacao) => void;
  onDelete?: (movement: Movimentacao) => void;
}

export function HistoryTable({ movements, materials, onEdit, onDelete }: HistoryTableProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterResponsavel, setFilterResponsavel] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterMaterial, setFilterMaterial] = useState("");
  const [selectedImage, setSelectedImage] = useState<{ url: string; alt: string } | null>(null);

  const getMaterialName = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    return material ? `${material.codigo} - ${material.descricao}` : "Material não encontrado";
  };

  const getMaterial = (materialId: string) => {
    return materials.find((m) => m.id === materialId);
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

  const getMovementLabel = (tipo: string) => {
    switch (tipo) {
      case "entrada": return "Entrada";
      case "saida": return "Saída";
      case "emprestimo": return "Empréstimo";
      case "devolucao": return "Devolução";
      default: return tipo;
    }
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

  const getMovementVariant = (tipo: string): "success" | "destructive" | "default" | "secondary" => {
    switch (tipo) {
      case "entrada": return "success";
      case "saida": return "destructive";
      case "emprestimo": return "secondary";
      case "devolucao": return "default";
      default: return "default";
    }
  };

  const availableCategories = Array.from(new Set(
    materials
      .filter(m => m.categoria)
      .map(m => m.categoria!)
  )).sort();

  const filteredMovements = movements.filter((movement) => {
    if (filterType !== "all" && movement.tipo !== filterType) return false;
    if (filterResponsavel && !movement.responsavel.toLowerCase().includes(filterResponsavel.toLowerCase())) return false;
    if (filterMaterial) {
      const materialName = getMaterialName(movement.materialId).toLowerCase();
      if (!materialName.includes(filterMaterial.toLowerCase())) return false;
    }
    if (filterCategoria !== "all") {
      const material = getMaterial(movement.materialId);
      if (!material?.categoria || material.categoria !== filterCategoria) return false;
    }
    if (filterStartDate) {
      const movementDate = new Date(movement.data);
      const startDate = new Date(filterStartDate);
      if (movementDate < startDate) return false;
    }
    if (filterEndDate) {
      const movementDate = new Date(movement.data);
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (movementDate > endDate) return false;
    }
    return true;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Histórico de Movimentações", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, 14, 30);
    
    const tableData = filteredMovements.map((movement) => {
      const material = getMaterial(movement.materialId);
      return [
        formatDate(movement.data),
        getMovementLabel(movement.tipo),
        getMaterialName(movement.materialId),
        material?.categoria || "-",
        movement.quantidade.toString(),
        movement.responsavel,
        movement.observacao || "-"
      ];
    });

    autoTable(doc, {
      head: [["Data/Hora", "Tipo", "Material", "Categoria", "Qtd", "Responsável", "Observação"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    doc.save(`movimentacoes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 sm:gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="text-xs sm:text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
            <SelectItem value="emprestimo">Empréstimo</SelectItem>
            <SelectItem value="devolucao">Devolução</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="text-xs sm:text-sm">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {availableCategories.map((categoria) => (
              <SelectItem key={categoria} value={categoria}>
                {categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Nome do material..."
          className="text-xs sm:text-sm"
          value={filterMaterial}
          onChange={(e) => setFilterMaterial(e.target.value)}
        />

        <Input
          placeholder="Responsável..."
          className="text-xs sm:text-sm"
          value={filterResponsavel}
          onChange={(e) => setFilterResponsavel(e.target.value)}
        />

        <Input
          type="date"
          placeholder="Data inicial"
          className="text-xs sm:text-sm"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
        />

        <Input
          type="date"
          placeholder="Data final"
          className="text-xs sm:text-sm"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
        />

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
              <TableHead className="hidden lg:table-cell">Data/Hora</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="min-w-[150px]">Material</TableHead>
              <TableHead className="hidden md:table-cell">Categoria</TableHead>
              <TableHead className="text-center">Qtd.</TableHead>
              <TableHead className="hidden sm:table-cell">Responsável</TableHead>
              <TableHead className="hidden lg:table-cell">Observação</TableHead>
              <TableHead className="text-center min-w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMovements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredMovements.map((movement) => {
                const material = getMaterial(movement.materialId);
                return (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {material?.fotoUrl ? (
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
                        <div className="w-8 h-8 sm:w-12 sm:h-12 bg-muted rounded flex items-center justify-center">
                          <span className="hidden sm:inline text-xs text-muted-foreground">Sem foto</span>
                          <span className="sm:hidden text-xs">-</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm hidden lg:table-cell">{formatDate(movement.data)}</TableCell>
                    <TableCell>
                      <Badge variant={getMovementVariant(movement.tipo)} className="gap-1 text-xs">
                        {getMovementIcon(movement.tipo)}
                        <span className="hidden sm:inline">{getMovementLabel(movement.tipo)}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{getMaterialName(movement.materialId)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {material?.categoria ? (
                        <Badge variant="outline" className="text-xs">{material.categoria}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-xs sm:text-sm">{movement.quantidade}</TableCell>
                    <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{movement.responsavel}</TableCell>
                    <TableCell className="text-muted-foreground text-xs sm:text-sm hidden lg:table-cell">
                      {movement.observacao || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEdit(movement)}
                            title="Editar"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onDelete(movement)}
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
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
