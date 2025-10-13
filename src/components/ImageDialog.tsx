import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImageDialogProps {
  imageUrl: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageDialog({ imageUrl, alt, open, onOpenChange }: ImageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <img 
          src={imageUrl} 
          alt={alt}
          className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/600?text=Imagem+não+encontrada";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
