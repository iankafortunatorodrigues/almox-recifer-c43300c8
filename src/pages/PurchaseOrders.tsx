import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  FileDown,
  Upload,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Trash2,
  Eye,
  ChevronRight,
  Package,
  History,
  X,
  Send,
  DollarSign,
  Calendar,
  User,
  Building,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Types
interface PurchaseOrder {
  id: string;
  numero_pedido: string;
  solicitante_id: string;
  aprovador_id: string | null;
  status: "pedido" | "cotacao" | "aprovacao" | "comprado" | "cancelado";
  urgencia: "baixa" | "normal" | "alta" | "critica";
  centro_custo: string;
  observacao: string | null;
  justificativa: string | null;
  data_necessidade: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseItem[];
  quotations?: PurchaseQuotation[];
  history?: PurchaseHistory[];
  solicitante_nome?: string;
}

interface PurchaseItem {
  id: string;
  pedido_id: string;
  descricao: string;
  categoria: string | null;
  quantidade: number;
  unidade: string;
  valor_estimado: number | null;
}

interface PurchaseQuotation {
  id: string;
  pedido_id: string;
  fornecedor: string;
  valor_total: number;
  arquivo_url: string | null;
  observacao: string | null;
  selecionada: boolean;
  validade: string | null;
  created_at: string;
}

interface PurchaseHistory {
  id: string;
  pedido_id: string;
  usuario_id: string;
  acao: string;
  status_anterior: string | null;
  status_novo: string | null;
  observacao: string | null;
  created_at: string;
  usuario_nome?: string;
}

// Status configuration
const STATUS_CONFIG = {
  pedido: { label: "Pedido", color: "bg-blue-500", icon: Package },
  cotacao: { label: "Cotações", color: "bg-orange-500", icon: FileText },
  aprovacao: { label: "Aprovação", color: "bg-purple-500", icon: Clock },
  comprado: { label: "Comprado", color: "bg-green-500", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "bg-gray-500", icon: X },
};

const URGENCIA_CONFIG = {
  baixa: { label: "Baixa", color: "bg-gray-400 text-white" },
  normal: { label: "Normal", color: "bg-blue-400 text-white" },
  alta: { label: "Alta", color: "bg-orange-500 text-white" },
  critica: { label: "Crítica", color: "bg-red-600 text-white animate-pulse" },
};

export default function PurchaseOrders() {
  const { user } = useAuth();
  const { isAdmin, isCompras, isDiretor, isAlmoxarife, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  // States
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pedido");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [urgenciaFilter, setUrgenciaFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Dialogs
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);

  // New Order Form
  const [newOrderItems, setNewOrderItems] = useState<Omit<PurchaseItem, "id" | "pedido_id">[]>([
    { descricao: "", categoria: "", quantidade: 1, unidade: "UN", valor_estimado: null },
  ]);
  const [newOrderData, setNewOrderData] = useState({
    centro_custo: "",
    urgencia: "normal" as "baixa" | "normal" | "alta" | "critica",
    observacao: "",
    data_necessidade: "",
  });

  // New Quotation Form
  const [newQuotation, setNewQuotation] = useState({
    fornecedor: "",
    valor_total: "",
    observacao: "",
    validade: "",
  });
  const [quotationFile, setQuotationFile] = useState<File | null>(null);

  // Permissions
  const canCreate = true; // Todos podem criar pedidos
  const canManageQuotations = isCompras || isAdmin;
  const canApprove = isDiretor || isAdmin;
  const canViewAll = isCompras || isDiretor || isAdmin;

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          items:purchase_items(*),
          quotations:purchase_quotations(*),
          history:purchase_history(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load profile names
      const userIds = new Set<string>();
      data?.forEach((order) => {
        userIds.add(order.solicitante_id);
        order.history?.forEach((h: any) => userIds.add(h.usuario_id));
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.id, p.nome || p.email]) || []);

      const ordersWithNames = data?.map((order) => ({
        ...order,
        solicitante_nome: profileMap.get(order.solicitante_id) || "Desconhecido",
        history: order.history?.map((h: any) => ({
          ...h,
          usuario_nome: profileMap.get(h.usuario_id) || "Desconhecido",
        })),
      }));

      setOrders(ordersWithNames || []);
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!roleLoading && user) {
      loadOrders();
    }
  }, [roleLoading, user, loadOrders]);

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchQuery === "" ||
      order.numero_pedido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.centro_custo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items?.some((item) =>
        item.descricao.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesUrgencia = urgenciaFilter === "all" || order.urgencia === urgenciaFilter;
    const matchesTab = order.status === activeTab;

    return matchesSearch && matchesUrgencia && matchesTab;
  });

  // Count by status
  const countByStatus = (status: string) =>
    orders.filter((o) => o.status === status).length;

  // Create new order
  const handleCreateOrder = async () => {
    if (!user) return;

    const validItems = newOrderItems.filter((item) => item.descricao.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }

    if (!newOrderData.centro_custo) {
      toast.error("Informe o centro de custo");
      return;
    }

    try {
      // Create order - numero_pedido is generated automatically by trigger
      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          solicitante_id: user.id,
          centro_custo: newOrderData.centro_custo,
          urgencia: newOrderData.urgencia,
          observacao: newOrderData.observacao || null,
          data_necessidade: newOrderData.data_necessidade || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create items
      const itemsToInsert = validItems.map((item) => ({
        pedido_id: order.id,
        descricao: item.descricao,
        categoria: item.categoria || null,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valor_estimado: item.valor_estimado,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Create history
      await supabase.from("purchase_history").insert({
        pedido_id: order.id,
        usuario_id: user.id,
        acao: "Pedido criado",
        status_novo: "pedido",
      });

      toast.success(`Pedido ${order.numero_pedido} criado com sucesso!`);
      setShowNewOrderDialog(false);
      resetNewOrderForm();
      loadOrders();
    } catch (error: any) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao criar pedido: " + error.message);
    }
  };

  const resetNewOrderForm = () => {
    setNewOrderItems([
      { descricao: "", categoria: "", quantidade: 1, unidade: "UN", valor_estimado: null },
    ]);
    setNewOrderData({
      centro_custo: "",
      urgencia: "normal",
      observacao: "",
      data_necessidade: "",
    });
  };

  // Add item to order
  const addItemToOrder = () => {
    setNewOrderItems([
      ...newOrderItems,
      { descricao: "", categoria: "", quantidade: 1, unidade: "UN", valor_estimado: null },
    ]);
  };

  // Remove item from order
  const removeItemFromOrder = (index: number) => {
    if (newOrderItems.length > 1) {
      setNewOrderItems(newOrderItems.filter((_, i) => i !== index));
    }
  };

  // Update item
  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...newOrderItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewOrderItems(updated);
  };

  // View order details
  const viewOrderDetails = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Add quotation
  const handleAddQuotation = async () => {
    if (!selectedOrder || !user) return;

    if (!newQuotation.fornecedor || !newQuotation.valor_total) {
      toast.error("Preencha fornecedor e valor");
      return;
    }

    try {
      let arquivo_url = null;

      // Upload file if exists
      if (quotationFile) {
        const fileExt = quotationFile.name.split(".").pop();
        const fileName = `${selectedOrder.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("purchase-attachments")
          .upload(fileName, quotationFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("purchase-attachments")
          .getPublicUrl(fileName);

        arquivo_url = urlData.publicUrl;
      }

      // Insert quotation
      const { error } = await supabase.from("purchase_quotations").insert({
        pedido_id: selectedOrder.id,
        fornecedor: newQuotation.fornecedor,
        valor_total: parseFloat(newQuotation.valor_total),
        observacao: newQuotation.observacao || null,
        validade: newQuotation.validade || null,
        arquivo_url,
      });

      if (error) throw error;

      // Update status to cotacao if first quotation
      if (selectedOrder.status === "pedido") {
        await updateOrderStatus(selectedOrder.id, "cotacao", "Primeira cotação anexada");
      }

      // Add history
      await supabase.from("purchase_history").insert({
        pedido_id: selectedOrder.id,
        usuario_id: user.id,
        acao: `Cotação adicionada: ${newQuotation.fornecedor} - R$ ${parseFloat(newQuotation.valor_total).toFixed(2)}`,
      });

      toast.success("Cotação adicionada com sucesso!");
      setShowQuotationDialog(false);
      setNewQuotation({ fornecedor: "", valor_total: "", observacao: "", validade: "" });
      setQuotationFile(null);
      loadOrders();
    } catch (error: any) {
      console.error("Erro ao adicionar cotação:", error);
      toast.error("Erro ao adicionar cotação: " + error.message);
    }
  };

  // Select quotation
  const selectQuotation = async (quotationId: string) => {
    if (!selectedOrder || !user) return;

    try {
      // Deselect all
      await supabase
        .from("purchase_quotations")
        .update({ selecionada: false })
        .eq("pedido_id", selectedOrder.id);

      // Select this one
      await supabase
        .from("purchase_quotations")
        .update({ selecionada: true })
        .eq("id", quotationId);

      const quotation = selectedOrder.quotations?.find((q) => q.id === quotationId);

      await supabase.from("purchase_history").insert({
        pedido_id: selectedOrder.id,
        usuario_id: user.id,
        acao: `Cotação selecionada: ${quotation?.fornecedor}`,
      });

      toast.success("Cotação selecionada!");
      loadOrders();
    } catch (error: any) {
      toast.error("Erro ao selecionar cotação");
    }
  };

  // Update order status
  const updateOrderStatus = async (
    orderId: string,
    newStatus: string,
    observacao?: string
  ) => {
    if (!user) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "comprado") {
        updateData.aprovador_id = user.id;
      }

      const { error } = await supabase
        .from("purchase_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      await supabase.from("purchase_history").insert({
        pedido_id: orderId,
        usuario_id: user.id,
        acao: observacao || `Status alterado para ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label}`,
        status_anterior: order.status,
        status_novo: newStatus,
      });

      toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label}`);
      loadOrders();
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  // Send to approval
  const sendToApproval = async () => {
    if (!selectedOrder) return;

    const hasSelectedQuotation = selectedOrder.quotations?.some((q) => q.selecionada);
    if (!hasSelectedQuotation) {
      toast.error("Selecione uma cotação antes de enviar para aprovação");
      return;
    }

    await updateOrderStatus(selectedOrder.id, "aprovacao", "Enviado para aprovação");
    setShowOrderDetails(false);
  };

  // Approve order
  const approveOrder = async () => {
    if (!selectedOrder) return;
    await updateOrderStatus(selectedOrder.id, "comprado", "Pedido aprovado");
    setShowOrderDetails(false);
  };

  // Cancel order
  const cancelOrder = async () => {
    if (!selectedOrder) return;
    await updateOrderStatus(selectedOrder.id, "cancelado", "Pedido cancelado");
    setShowOrderDetails(false);
  };

  // Export functions
  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Relatório de Pedidos de Compra", 14, 22);
    doc.setFontSize(10);
    doc.text(
      `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      14,
      30
    );

    const tableData = filteredOrders.map((o) => [
      o.numero_pedido,
      o.items?.map((i) => i.descricao).join(", ").substring(0, 40) || "-",
      o.centro_custo,
      URGENCIA_CONFIG[o.urgencia].label,
      STATUS_CONFIG[o.status].label,
      format(new Date(o.created_at), "dd/MM/yyyy"),
    ]);

    autoTable(doc, {
      head: [["Nº Pedido", "Itens", "Centro Custo", "Urgência", "Status", "Data"]],
      body: tableData,
      startY: 36,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 95] },
    });

    doc.save(`pedidos-compra-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado!");
  };

  const exportToExcel = () => {
    const excelData = filteredOrders.map((o) => ({
      "Nº Pedido": o.numero_pedido,
      Itens: o.items?.map((i) => `${i.quantidade}x ${i.descricao}`).join("; ") || "-",
      "Centro de Custo": o.centro_custo,
      Urgência: URGENCIA_CONFIG[o.urgencia].label,
      Status: STATUS_CONFIG[o.status].label,
      Solicitante: o.solicitante_nome,
      "Data Criação": format(new Date(o.created_at), "dd/MM/yyyy HH:mm"),
      "Valor Total Cotações": o.quotations
        ?.filter((q) => q.selecionada)
        .reduce((acc, q) => acc + q.valor_total, 0)
        .toFixed(2) || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `pedidos-compra-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel exportado!");
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Compras e Suprimentos</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Gestão completa de pedidos de compra
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="hidden sm:flex"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              {canCreate && (
                <Button onClick={() => setShowNewOrderDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Novo Pedido</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["pedido", "cotacao", "aprovacao", "comprado", "cancelado"] as const).map(
            (status) => {
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              const count = countByStatus(status);

              return (
                <Card
                  key={status}
                  className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                    activeTab === status ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setActiveTab(status)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <div className={`p-2 rounded-full ${config.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </Card>
              );
            }
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nº pedido, item ou centro de custo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Urgência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critica">🔴 Crítica</SelectItem>
                  <SelectItem value="alta">🟠 Alta</SelectItem>
                  <SelectItem value="normal">🔵 Normal</SelectItem>
                  <SelectItem value="baixa">⚪ Baixa</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToPDF} className="flex-1">
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel} className="flex-1">
                  <FileDown className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Mobile Search */}
        <div className="sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status Tabs (Mobile) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="sm:hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pedido" className="text-xs">
              Pedido
            </TabsTrigger>
            <TabsTrigger value="cotacao" className="text-xs">
              Cotação
            </TabsTrigger>
            <TabsTrigger value="aprovacao" className="text-xs">
              Aprov.
            </TabsTrigger>
            <TabsTrigger value="comprado" className="text-xs">
              Compr.
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Orders List */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead className="hidden md:table-cell">Itens</TableHead>
                <TableHead className="hidden sm:table-cell">Centro Custo</TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead className="hidden lg:table-cell">Solicitante</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => viewOrderDetails(order)}
                  >
                    <TableCell>
                      <div className="font-bold text-primary">{order.numero_pedido}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">
                        {order.items?.length || 0} itens
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="max-w-[200px] truncate">
                        {order.items?.map((i) => i.descricao).join(", ") || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.items?.length || 0} itens
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{order.centro_custo}</TableCell>
                    <TableCell>
                      <Badge className={URGENCIA_CONFIG[order.urgencia].color}>
                        {URGENCIA_CONFIG[order.urgencia].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {order.solicitante_nome}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(order.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {/* New Order Dialog */}
      <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pedido de Compra</DialogTitle>
            <DialogDescription>
              Preencha os dados do pedido e adicione os itens necessários.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Order Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Centro de Custo *</Label>
                <Input
                  value={newOrderData.centro_custo}
                  onChange={(e) =>
                    setNewOrderData({ ...newOrderData, centro_custo: e.target.value })
                  }
                  placeholder="Ex: Manutenção, Produção..."
                />
              </div>
              <div>
                <Label>Urgência</Label>
                <Select
                  value={newOrderData.urgencia}
                  onValueChange={(v) =>
                    setNewOrderData({
                      ...newOrderData,
                      urgencia: v as "baixa" | "normal" | "alta" | "critica",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">⚪ Baixa</SelectItem>
                    <SelectItem value="normal">🔵 Normal</SelectItem>
                    <SelectItem value="alta">🟠 Alta</SelectItem>
                    <SelectItem value="critica">🔴 Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Necessidade</Label>
                <Input
                  type="date"
                  value={newOrderData.data_necessidade}
                  onChange={(e) =>
                    setNewOrderData({ ...newOrderData, data_necessidade: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={newOrderData.observacao}
                onChange={(e) =>
                  setNewOrderData({ ...newOrderData, observacao: e.target.value })
                }
                placeholder="Informações adicionais sobre o pedido..."
                rows={2}
              />
            </div>

            <Separator />

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Itens do Pedido</Label>
                <Button variant="outline" size="sm" onClick={addItemToOrder}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Item
                </Button>
              </div>

              <div className="space-y-3">
                {newOrderItems.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 md:col-span-5">
                        <Label className="text-xs">Descrição *</Label>
                        <Input
                          value={item.descricao}
                          onChange={(e) => updateItem(index, "descricao", e.target.value)}
                          placeholder="Nome do item..."
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label className="text-xs">Qtd *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={(e) =>
                            updateItem(index, "quantidade", parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label className="text-xs">Unidade</Label>
                        <Select
                          value={item.unidade}
                          onValueChange={(v) => updateItem(index, "unidade", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UN">UN</SelectItem>
                            <SelectItem value="KG">KG</SelectItem>
                            <SelectItem value="MT">MT</SelectItem>
                            <SelectItem value="LT">LT</SelectItem>
                            <SelectItem value="CX">CX</SelectItem>
                            <SelectItem value="PC">PC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <Label className="text-xs">Categoria</Label>
                        <Input
                          value={item.categoria || ""}
                          onChange={(e) => updateItem(index, "categoria", e.target.value)}
                          placeholder="Categoria"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemFromOrder(index)}
                          disabled={newOrderItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewOrderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrder}>
              <Send className="h-4 w-4 mr-2" />
              Criar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Sheet */}
      <Sheet open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <SheetTitle className="text-2xl">
                      {selectedOrder.numero_pedido}
                    </SheetTitle>
                    <SheetDescription>
                      Criado em{" "}
                      {format(new Date(selectedOrder.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </SheetDescription>
                  </div>
                  <Badge className={STATUS_CONFIG[selectedOrder.status].color + " text-white"}>
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Solicitante</p>
                      <p className="font-medium">{selectedOrder.solicitante_nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Centro de Custo</p>
                      <p className="font-medium">{selectedOrder.centro_custo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Urgência</p>
                      <Badge className={URGENCIA_CONFIG[selectedOrder.urgencia].color}>
                        {URGENCIA_CONFIG[selectedOrder.urgencia].label}
                      </Badge>
                    </div>
                  </div>
                  {selectedOrder.data_necessidade && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data Necessidade</p>
                        <p className="font-medium">
                          {format(new Date(selectedOrder.data_necessidade), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedOrder.observacao && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Observação</p>
                    <p>{selectedOrder.observacao}</p>
                  </div>
                )}

                <Separator />

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Itens ({selectedOrder.items?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <Card key={item.id} className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{item.descricao}</p>
                            {item.categoria && (
                              <Badge variant="outline" className="mt-1">
                                {item.categoria}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              {item.quantidade} {item.unidade}
                            </p>
                            {item.valor_estimado && (
                              <p className="text-sm text-muted-foreground">
                                R$ {item.valor_estimado.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Quotations */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cotações ({selectedOrder.quotations?.length || 0})
                    </h3>
                    {canManageQuotations &&
                      ["pedido", "cotacao"].includes(selectedOrder.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowQuotationDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      )}
                  </div>

                  {selectedOrder.quotations && selectedOrder.quotations.length > 0 ? (
                    <div className="space-y-2">
                      {selectedOrder.quotations
                        .sort((a, b) => a.valor_total - b.valor_total)
                        .map((quotation, index) => (
                          <Card
                            key={quotation.id}
                            className={`p-3 ${
                              quotation.selecionada
                                ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-950"
                                : ""
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{quotation.fornecedor}</p>
                                  {index === 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      Menor preço
                                    </Badge>
                                  )}
                                  {quotation.selecionada && (
                                    <Badge className="bg-green-500 text-white text-xs">
                                      Selecionada
                                    </Badge>
                                  )}
                                </div>
                                {quotation.validade && (
                                  <p className="text-xs text-muted-foreground">
                                    Válida até:{" "}
                                    {format(new Date(quotation.validade), "dd/MM/yyyy")}
                                  </p>
                                )}
                                {quotation.arquivo_url && (
                                  <a
                                    href={quotation.arquivo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary flex items-center gap-1 mt-1"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    Ver anexo
                                  </a>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">
                                  R$ {quotation.valor_total.toFixed(2)}
                                </p>
                                {canManageQuotations &&
                                  !quotation.selecionada &&
                                  selectedOrder.status === "cotacao" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => selectQuotation(quotation.id)}
                                      className="mt-1"
                                    >
                                      Selecionar
                                    </Button>
                                  )}
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma cotação cadastrada
                    </p>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowHistorySheet(true)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Ver Histórico Completo
                  </Button>

                  {canManageQuotations && selectedOrder.status === "cotacao" && (
                    <Button className="w-full" onClick={sendToApproval}>
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Enviar para Aprovação
                    </Button>
                  )}

                  {canApprove && selectedOrder.status === "aprovacao" && (
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={approveOrder}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprovar Compra
                    </Button>
                  )}

                  {selectedOrder.status === "pedido" &&
                    selectedOrder.solicitante_id === user?.id && (
                      <Button variant="destructive" className="w-full" onClick={cancelOrder}>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar Pedido
                      </Button>
                    )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Quotation Dialog */}
      <Dialog open={showQuotationDialog} onOpenChange={setShowQuotationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Cotação</DialogTitle>
            <DialogDescription>
              Adicione os dados da cotação e anexe o arquivo se disponível.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fornecedor *</Label>
              <Input
                value={newQuotation.fornecedor}
                onChange={(e) =>
                  setNewQuotation({ ...newQuotation, fornecedor: e.target.value })
                }
                placeholder="Nome do fornecedor"
              />
            </div>

            <div>
              <Label>Valor Total *</Label>
              <Input
                type="number"
                step="0.01"
                value={newQuotation.valor_total}
                onChange={(e) =>
                  setNewQuotation({ ...newQuotation, valor_total: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Validade da Cotação</Label>
              <Input
                type="date"
                value={newQuotation.validade}
                onChange={(e) =>
                  setNewQuotation({ ...newQuotation, validade: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={newQuotation.observacao}
                onChange={(e) =>
                  setNewQuotation({ ...newQuotation, observacao: e.target.value })
                }
                placeholder="Condições de pagamento, prazo de entrega..."
                rows={2}
              />
            </div>

            <div>
              <Label>Anexo (PDF, Imagem)</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setQuotationFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuotationDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddQuotation}>
              <Upload className="h-4 w-4 mr-2" />
              Adicionar Cotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Sheet */}
      <Sheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Histórico do Pedido</SheetTitle>
            <SheetDescription>
              Todas as ações realizadas neste pedido.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-150px)] mt-4">
            <div className="space-y-4">
              {selectedOrder?.history
                ?.sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
                .map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <History className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entry.acao}</p>
                      <p className="text-xs text-muted-foreground">
                        por {entry.usuario_nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      {entry.observacao && (
                        <p className="text-sm mt-1 p-2 bg-muted rounded">
                          {entry.observacao}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
