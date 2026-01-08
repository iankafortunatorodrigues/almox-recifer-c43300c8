import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Camera,
  FileImage,
  Package,
  Search,
  Calendar,
  Eye,
  X,
  FileSpreadsheet,
  FileText,
  Pencil,
  Lock,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

interface RecebimentoItem {
  id?: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  observacao?: string;
}

interface Recebimento {
  id: string;
  fornecedor: string;
  tipo_recebimento: string;
  data_recebimento: string;
  foto_nota_url?: string;
  numero_nota?: string;
  observacao?: string;
  created_at: string;
  itens?: RecebimentoItem[];
}

interface Filters {
  search: string;
  tipo: string;
  dataInicio: string;
  dataFim: string;
}

const ACTION_PASSWORD = "200991";

export default function Recebimentos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedRecebimento, setSelectedRecebimento] = useState<Recebimento | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [password, setPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: "edit" | "delete"; id: string } | null>(null);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    tipo: "todos",
    dataInicio: "",
    dataFim: "",
  });

  const [formData, setFormData] = useState({
    fornecedor: "",
    tipo_recebimento: "consumiveis",
    data_recebimento: format(new Date(), "yyyy-MM-dd"),
    foto_nota_url: "",
    numero_nota: "",
    observacao: "",
  });

  const [itens, setItens] = useState<RecebimentoItem[]>([
    { descricao: "", quantidade: 1, unidade: "UN", observacao: "" },
  ]);

  useEffect(() => {
    if (user) {
      fetchRecebimentos();
    }
  }, [user]);

  const fetchRecebimentos = async () => {
    try {
      const { data, error } = await supabase
        .from("recebimentos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecebimentos(data || []);
    } catch (error) {
      console.error("Erro ao buscar recebimentos:", error);
      toast.error("Erro ao carregar recebimentos");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("notas-fiscais")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("notas-fiscais")
        .getPublicUrl(fileName);

      setFormData({ ...formData, foto_nota_url: urlData.publicUrl });
      toast.success("Foto enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addItem = () => {
    setItens([...itens, { descricao: "", quantidade: 1, unidade: "UN", observacao: "" }]);
  };

  const removeItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof RecebimentoItem, value: string | number) => {
    const newItens = [...itens];
    newItens[index] = { ...newItens[index], [field]: value };
    setItens(newItens);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validItens = itens.filter((item) => item.descricao.trim());
    if (validItens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    try {
      const { data: recebimento, error: recebimentoError } = await supabase
        .from("recebimentos")
        .insert({
          user_id: user.id,
          fornecedor: formData.fornecedor,
          tipo_recebimento: formData.tipo_recebimento,
          data_recebimento: formData.data_recebimento,
          foto_nota_url: formData.foto_nota_url || null,
          numero_nota: formData.numero_nota || null,
          observacao: formData.observacao || null,
        })
        .select()
        .single();

      if (recebimentoError) throw recebimentoError;

      const itensToInsert = validItens.map((item) => ({
        recebimento_id: recebimento.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        observacao: item.observacao || null,
      }));

      const { error: itensError } = await supabase
        .from("recebimento_itens")
        .insert(itensToInsert);

      if (itensError) throw itensError;

      toast.success("Recebimento registrado com sucesso!");
      setDialogOpen(false);
      resetForm();
      fetchRecebimentos();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao registrar recebimento");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecebimento) return;

    const validItens = itens.filter((item) => item.descricao.trim());
    if (validItens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("recebimentos")
        .update({
          fornecedor: formData.fornecedor,
          tipo_recebimento: formData.tipo_recebimento,
          data_recebimento: formData.data_recebimento,
          foto_nota_url: formData.foto_nota_url || null,
          numero_nota: formData.numero_nota || null,
          observacao: formData.observacao || null,
        })
        .eq("id", selectedRecebimento.id);

      if (updateError) throw updateError;

      // Deletar itens antigos e inserir novos
      await supabase.from("recebimento_itens").delete().eq("recebimento_id", selectedRecebimento.id);

      const itensToInsert = validItens.map((item) => ({
        recebimento_id: selectedRecebimento.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        observacao: item.observacao || null,
      }));

      const { error: itensError } = await supabase.from("recebimento_itens").insert(itensToInsert);
      if (itensError) throw itensError;

      toast.success("Recebimento atualizado com sucesso!");
      setEditDialogOpen(false);
      setSelectedRecebimento(null);
      resetForm();
      fetchRecebimentos();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar recebimento");
    }
  };

  const resetForm = () => {
    setFormData({
      fornecedor: "",
      tipo_recebimento: "consumiveis",
      data_recebimento: format(new Date(), "yyyy-MM-dd"),
      foto_nota_url: "",
      numero_nota: "",
      observacao: "",
    });
    setItens([{ descricao: "", quantidade: 1, unidade: "UN", observacao: "" }]);
  };

  const viewRecebimento = async (recebimento: Recebimento) => {
    try {
      const { data: itensData } = await supabase
        .from("recebimento_itens")
        .select("*")
        .eq("recebimento_id", recebimento.id);

      setSelectedRecebimento({ ...recebimento, itens: itensData || [] });
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
    }
  };

  const requestAction = (type: "edit" | "delete", id: string) => {
    setPendingAction({ type, id });
    setPassword("");
    setPasswordDialogOpen(true);
  };

  const confirmPassword = async () => {
    if (password !== ACTION_PASSWORD) {
      toast.error("Senha incorreta!");
      return;
    }

    setPasswordDialogOpen(false);
    setPassword("");

    if (!pendingAction) return;

    if (pendingAction.type === "delete") {
      await executeDelete(pendingAction.id);
    } else if (pendingAction.type === "edit") {
      await openEditDialog(pendingAction.id);
    }

    setPendingAction(null);
  };

  const openEditDialog = async (id: string) => {
    const recebimento = recebimentos.find((r) => r.id === id);
    if (!recebimento) return;

    const { data: itensData } = await supabase
      .from("recebimento_itens")
      .select("*")
      .eq("recebimento_id", id);

    setFormData({
      fornecedor: recebimento.fornecedor,
      tipo_recebimento: recebimento.tipo_recebimento,
      data_recebimento: recebimento.data_recebimento,
      foto_nota_url: recebimento.foto_nota_url || "",
      numero_nota: recebimento.numero_nota || "",
      observacao: recebimento.observacao || "",
    });

    setItens(
      itensData && itensData.length > 0
        ? itensData.map((i) => ({
            id: i.id,
            descricao: i.descricao,
            quantidade: i.quantidade,
            unidade: i.unidade,
            observacao: i.observacao || "",
          }))
        : [{ descricao: "", quantidade: 1, unidade: "UN", observacao: "" }]
    );

    setSelectedRecebimento(recebimento);
    setEditDialogOpen(true);
  };

  const executeDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("recebimentos").delete().eq("id", id);
      if (error) throw error;
      toast.success("Recebimento excluído!");
      fetchRecebimentos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir recebimento");
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "consumiveis": return "Consumíveis";
      case "materia_prima": return "Matéria Prima";
      case "vendas": return "Vendas";
      default: return tipo;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "consumiveis": return "secondary";
      case "materia_prima": return "default";
      case "vendas": return "outline";
      default: return "secondary";
    }
  };

  // Converter imagem URL para base64
  const imageUrlToBase64 = async (url: string): Promise<string | null> => {
    try {
      console.log("Fetching image:", url);
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        console.error("Failed to fetch image:", response.status);
        return null;
      }
      const blob = await response.blob();
      console.log("Image blob size:", blob.size, "type:", blob.type);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log("Image converted to base64");
          resolve(reader.result as string);
        };
        reader.onerror = (e) => {
          console.error("FileReader error:", e);
          resolve(null);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image:", error);
      return null;
    }
  };

  // Converter imagem para ArrayBuffer (para Excel)
  const imageUrlToArrayBuffer = async (url: string): Promise<{ buffer: ArrayBuffer; extension: "png" | "jpeg" } | null> => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) return null;
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const extension = blob.type.includes("png") ? "png" : "jpeg";
      return { buffer: arrayBuffer, extension };
    } catch (error) {
      console.error("Error fetching image for Excel:", error);
      return null;
    }
  };

  // Exportar para Excel com imagem embutida
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Recebimentos';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet("Recebimentos", {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // Título
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Relatório de Recebimentos';
    titleCell.font = { bold: true, size: 18, color: { argb: 'FF1E3A5F' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 35;

    // Subtítulo com data
    worksheet.mergeCells('A2:H2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`;
    subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
    subtitleCell.alignment = { horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Cabecalho da tabela
    const headerRow = worksheet.getRow(4);
    const headers = ['#', 'Data', 'Fornecedor', 'N° Nota', 'Tipo', 'Itens Recebidos', 'Observacao', 'Nota Fiscal'];
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1E3A5F' } },
        bottom: { style: 'thin', color: { argb: 'FF1E3A5F' } },
      };
    });
    headerRow.height = 25;

    // Larguras das colunas
    worksheet.getColumn(1).width = 5;   // #
    worksheet.getColumn(2).width = 12;  // Data
    worksheet.getColumn(3).width = 22;  // Fornecedor
    worksheet.getColumn(4).width = 15;  // N° Nota
    worksheet.getColumn(5).width = 14;  // Tipo
    worksheet.getColumn(6).width = 35;  // Itens
    worksheet.getColumn(7).width = 20;  // Observacao
    worksheet.getColumn(8).width = 18;  // Nota Fiscal (imagem)

    let rowIndex = 5;
    let contador = 1;
    
    for (const r of filteredRecebimentos) {
      const { data: itensData } = await supabase
        .from("recebimento_itens")
        .select("*")
        .eq("recebimento_id", r.id);

      const itensStr = itensData?.map((i) => `- ${i.descricao} (${i.quantidade} ${i.unidade})`).join("\n") || "";

      const row = worksheet.getRow(rowIndex);
      row.getCell(1).value = contador;
      row.getCell(2).value = format(new Date(r.data_recebimento), "dd/MM/yyyy");
      row.getCell(3).value = r.fornecedor;
      row.getCell(4).value = r.numero_nota || "-";
      row.getCell(5).value = getTipoLabel(r.tipo_recebimento);
      row.getCell(6).value = itensStr;
      row.getCell(6).alignment = { wrapText: true, vertical: 'top' };
      row.getCell(7).value = r.observacao || "-";

      // Estilo alternado
      const bgColor = contador % 2 === 0 ? 'FFF5F5F5' : 'FFFFFFFF';
      for (let i = 1; i <= 8; i++) {
        row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        row.getCell(i).border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
        row.getCell(i).alignment = { ...row.getCell(i).alignment, vertical: 'middle' };
      }

      // Adicionar imagem embutida na célula
      if (r.foto_nota_url) {
        try {
          const imageData = await imageUrlToArrayBuffer(r.foto_nota_url);
          if (imageData) {
            const imageId = workbook.addImage({
              buffer: imageData.buffer,
              extension: imageData.extension,
            });
            
            // Definir altura da linha para acomodar a imagem
            row.height = 80;
            
            // Adicionar imagem à célula (coluna H = índice 7)
            worksheet.addImage(imageId, {
              tl: { col: 7, row: rowIndex - 1 },
              ext: { width: 100, height: 75 },
            });
          } else {
            row.getCell(8).value = "Erro ao carregar";
            row.getCell(8).font = { italic: true, color: { argb: 'FF999999' } };
            row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
          }
        } catch (error) {
          console.error("Erro ao adicionar imagem:", error);
          row.getCell(8).value = "Erro";
          row.getCell(8).font = { italic: true, color: { argb: 'FF999999' } };
        }
      } else {
        row.getCell(8).value = "Sem anexo";
        row.getCell(8).font = { italic: true, color: { argb: 'FF999999' } };
        row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
        row.height = Math.max(25, itensData?.length ? itensData.length * 15 + 10 : 25);
      }

      rowIndex++;
      contador++;
    }

    // Rodape
    const footerRow = worksheet.getRow(rowIndex + 1);
    worksheet.mergeCells(`A${rowIndex + 1}:H${rowIndex + 1}`);
    footerRow.getCell(1).value = `Total de ${filteredRecebimentos.length} recebimento(s)`;
    footerRow.getCell(1).font = { bold: true, size: 10 };
    footerRow.getCell(1).alignment = { horizontal: 'right' };

    // Gerar e baixar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `recebimentos_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success("Excel exportado com sucesso!");
  };

  // Exportar para PDF profissional com imagens grandes
  const exportToPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // Função para adicionar cabeçalho
    const addHeader = (pageNum: number) => {
      // Fundo do cabeçalho
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      // Título
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Recebimentos", margin, 18);
      
      // Subtítulo
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, margin, 28);
      
      // Número da página
      doc.text(`Página ${pageNum}`, pageWidth - margin - 20, 28);
      
      doc.setTextColor(0, 0, 0);
    };

    // Função para adicionar rodapé
    const addFooter = () => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Sistema de Gestão de Recebimentos", margin, pageHeight - 10);
      doc.setTextColor(0, 0, 0);
    };

    let pageNum = 1;
    addHeader(pageNum);
    addFooter();
    
    let yPosition = 45;
    let recebimentoNum = 1;

    for (const r of filteredRecebimentos) {
      const { data: itensData } = await supabase
        .from("recebimento_itens")
        .select("*")
        .eq("recebimento_id", r.id);

      const itens = itensData || [];
      
      // Calcular altura necessária para este recebimento (sem imagem)
      const itensHeight = Math.max(itens.length * 6, 12);
      const blockHeight = 35 + itensHeight + 20;

      // Nova página se necessário
      if (yPosition + blockHeight > pageHeight - 25) {
        doc.addPage();
        pageNum++;
        addHeader(pageNum);
        addFooter();
        yPosition = 45;
      }

      // Card container
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPosition, pageWidth - (margin * 2), blockHeight - 10, 3, 3, 'F');
      
      // Borda esquerda colorida
      const tipoColors: Record<string, [number, number, number]> = {
        'consumiveis': [59, 130, 246],
        'patrimonio': [16, 185, 129],
        'epis': [245, 158, 11],
        'materia_prima': [168, 85, 247],
        'vendas': [239, 68, 68],
      };
      const borderColor = tipoColors[r.tipo_recebimento] || [107, 114, 128];
      doc.setFillColor(...borderColor);
      doc.rect(margin, yPosition, 4, blockHeight - 10, 'F');

      // Número do recebimento
      doc.setFillColor(...borderColor);
      doc.circle(margin + 15, yPosition + 10, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(String(recebimentoNum), margin + 15, yPosition + 13, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Fornecedor
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(r.fornecedor, margin + 28, yPosition + 12);

      // Badge de tipo
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const tipoLabel = getTipoLabel(r.tipo_recebimento);
      const tipoWidth = doc.getTextWidth(tipoLabel) + 8;
      doc.setFillColor(...borderColor);
      doc.roundedRect(pageWidth - margin - tipoWidth - 5, yPosition + 5, tipoWidth, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(tipoLabel, pageWidth - margin - tipoWidth / 2 - 5, yPosition + 11.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Data
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Data: ${format(new Date(r.data_recebimento), "dd/MM/yyyy")}`, margin + 28, yPosition + 20);
      doc.setTextColor(0, 0, 0);

      // Itens
      let itemY = yPosition + 28;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Itens Recebidos:", margin + 8, itemY);
      itemY += 6;
      
      doc.setFont("helvetica", "normal");
      if (itens.length > 0) {
        itens.forEach((item) => {
          doc.text(`- ${item.descricao} (${item.quantidade} ${item.unidade})`, margin + 12, itemY);
          itemY += 5;
        });
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text("Nenhum item registrado", margin + 12, itemY);
        doc.setTextColor(0, 0, 0);
        itemY += 5;
      }

      // Observacao
      if (r.observacao) {
        itemY += 3;
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Obs: ${r.observacao}`, margin + 8, itemY);
        doc.setTextColor(0, 0, 0);
        itemY += 5;
      }

      // Indicar se tem nota fiscal anexada (sem imagem)
      if (r.foto_nota_url) {
        itemY += 3;
        doc.setFontSize(8);
        doc.setTextColor(59, 130, 246);
        doc.text("Nota fiscal anexada (visualizar no Excel)", margin + 8, itemY);
        doc.setTextColor(0, 0, 0);
      }

      yPosition += blockHeight;
      recebimentoNum++;
    }

    // Resumo final
    if (yPosition + 30 > pageHeight - 25) {
      doc.addPage();
      pageNum++;
      addHeader(pageNum);
      addFooter();
      yPosition = 45;
    }

    doc.setFillColor(30, 58, 95);
    doc.roundedRect(margin, yPosition + 5, pageWidth - (margin * 2), 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${filteredRecebimentos.length} recebimento(s)`, pageWidth / 2, yPosition + 17, { align: 'center' });

    doc.save(`recebimentos_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  // Filtrar recebimentos
  const filteredRecebimentos = recebimentos.filter((r) => {
    const matchSearch =
      r.fornecedor.toLowerCase().includes(filters.search.toLowerCase()) ||
      r.observacao?.toLowerCase().includes(filters.search.toLowerCase());

    const matchTipo = filters.tipo === "todos" || r.tipo_recebimento === filters.tipo;

    const matchDataInicio = !filters.dataInicio || r.data_recebimento >= filters.dataInicio;
    const matchDataFim = !filters.dataFim || r.data_recebimento <= filters.dataFim;

    return matchSearch && matchTipo && matchDataInicio && matchDataFim;
  });

  const renderForm = (isEdit = false) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleSubmit} className="space-y-4">
      {/* Foto da Nota Fiscal */}
      <div className="space-y-2">
        <Label>Foto da Nota Fiscal</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor={isEdit ? "fotoFileEdit" : "fotoFile"} className="cursor-pointer">
              <div className="flex items-center justify-center gap-2 h-10 px-4 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90">
                <FileImage className="h-4 w-4" />
                {uploadingPhoto ? "Enviando..." : "Arquivo"}
              </div>
            </Label>
            <Input
              id={isEdit ? "fotoFileEdit" : "fotoFile"}
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e)}
              className="hidden"
              disabled={uploadingPhoto}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor={isEdit ? "fotoCameraEdit" : "fotoCamera"} className="cursor-pointer">
              <div className="flex items-center justify-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                <Camera className="h-4 w-4" />
                {uploadingPhoto ? "Enviando..." : "Câmera"}
              </div>
            </Label>
            <Input
              id={isEdit ? "fotoCameraEdit" : "fotoCamera"}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoUpload(e, true)}
              className="hidden"
              disabled={uploadingPhoto}
            />
          </div>
        </div>
        {formData.foto_nota_url && (
          <div className="relative">
            <img
              src={formData.foto_nota_url}
              alt="Nota Fiscal"
              className="w-full h-32 object-cover rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setFormData({ ...formData, foto_nota_url: "" })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fornecedor">Fornecedor *</Label>
          <Input
            id="fornecedor"
            value={formData.fornecedor}
            onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
            placeholder="Nome do fornecedor"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo de Recebimento *</Label>
          <Select
            value={formData.tipo_recebimento}
            onValueChange={(value) => setFormData({ ...formData, tipo_recebimento: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consumiveis">Consumíveis</SelectItem>
              <SelectItem value="materia_prima">Matéria Prima</SelectItem>
              <SelectItem value="vendas">Vendas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data">Data de Recebimento *</Label>
          <Input
            id="data"
            type="date"
            value={formData.data_recebimento}
            onChange={(e) => setFormData({ ...formData, data_recebimento: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numero_nota">Número da Nota Fiscal</Label>
          <Input
            id="numero_nota"
            value={formData.numero_nota}
            onChange={(e) => setFormData({ ...formData, numero_nota: e.target.value })}
            placeholder="Ex: 123456"
          />
        </div>
      </div>

      {/* Itens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Itens Recebidos *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Item
          </Button>
        </div>
        <div className="space-y-3">
          {itens.map((item, index) => (
            <Card key={index} className="p-3">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 sm:col-span-5">
                  <Input
                    placeholder="Descrição do item"
                    value={item.descricao}
                    onChange={(e) => updateItem(index, "descricao", e.target.value)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    value={item.quantidade}
                    onChange={(e) => updateItem(index, "quantidade", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    placeholder="UN"
                    value={item.unidade}
                    onChange={(e) => updateItem(index, "unidade", e.target.value)}
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <Input
                    placeholder="Obs"
                    value={item.observacao || ""}
                    onChange={(e) => updateItem(index, "observacao", e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={itens.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacao">Observação Geral</Label>
        <Textarea
          id="observacao"
          value={formData.observacao}
          onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
          placeholder="Observações sobre o recebimento..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          {isEdit ? "Atualizar Recebimento" : "Registrar Recebimento"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            isEdit ? setEditDialogOpen(false) : setDialogOpen(false);
            resetForm();
            setSelectedRecebimento(null);
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Recebimento de Materiais</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Registrar Recebimento</DialogTitle>
                  </DialogHeader>
                  {renderForm(false)}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input
                  placeholder="Fornecedor ou observação..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={filters.tipo}
                  onValueChange={(value) => setFilters({ ...filters, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="consumiveis">Consumíveis</SelectItem>
                    <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
            </div>
            {(filters.search || filters.tipo !== "todos" || filters.dataInicio || filters.dataFim) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setFilters({ search: "", tipo: "todos", dataInicio: "", dataFim: "" })}
              >
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Lista de Recebimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recebimentos</span>
              <Badge variant="outline">{filteredRecebimentos.length} registros</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredRecebimentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum recebimento encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>N° Nota</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead className="text-center">Foto Nota</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecebimentos.map((recebimento) => (
                      <TableRow key={recebimento.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(recebimento.data_recebimento), "dd/MM/yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{recebimento.fornecedor}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {recebimento.numero_nota || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTipoBadgeVariant(recebimento.tipo_recebimento) as any}>
                            {getTipoLabel(recebimento.tipo_recebimento)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {recebimento.observacao || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {recebimento.foto_nota_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(recebimento.foto_nota_url, "_blank")}
                            >
                              <FileImage className="h-4 w-4 text-primary" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewRecebimento(recebimento)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => requestAction("edit", recebimento.id)}
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => requestAction("delete", recebimento.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Recebimento</DialogTitle>
          </DialogHeader>
          {selectedRecebimento && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Fornecedor</Label>
                  <p className="font-medium">{selectedRecebimento.fornecedor}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Data</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRecebimento.data_recebimento), "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">N° Nota Fiscal</Label>
                  <p className="font-medium font-mono">
                    {selectedRecebimento.numero_nota || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo</Label>
                  <Badge variant={getTipoBadgeVariant(selectedRecebimento.tipo_recebimento) as any}>
                    {getTipoLabel(selectedRecebimento.tipo_recebimento)}
                  </Badge>
                </div>
              </div>

              {selectedRecebimento.observacao && (
                <div>
                  <Label className="text-muted-foreground text-xs">Observação</Label>
                  <p>{selectedRecebimento.observacao}</p>
                </div>
              )}

              {selectedRecebimento.foto_nota_url && (
                <div>
                  <Label className="text-muted-foreground text-xs">Nota Fiscal</Label>
                  <img
                    src={selectedRecebimento.foto_nota_url}
                    alt="Nota Fiscal"
                    className="w-full h-48 object-cover rounded-md mt-1 cursor-pointer"
                    onClick={() => window.open(selectedRecebimento.foto_nota_url, "_blank")}
                  />
                </div>
              )}

              <div>
                <Label className="text-muted-foreground text-xs">Itens Recebidos</Label>
                <div className="mt-2 space-y-2">
                  {selectedRecebimento.itens?.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <span>{item.descricao}</span>
                      <Badge variant="outline">
                        {item.quantidade} {item.unidade}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Recebimento</DialogTitle>
          </DialogHeader>
          {renderForm(true)}
        </DialogContent>
      </Dialog>

      {/* Dialog de Senha */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confirmar Ação
            </DialogTitle>
            <DialogDescription>
              Digite a senha para {pendingAction?.type === "edit" ? "editar" : "excluir"} este recebimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Digite a senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmPassword()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmPassword}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
