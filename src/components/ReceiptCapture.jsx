import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, RotateCcw, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useToast } from '../context/ToastContext';

const ReceiptCapture = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef(null);
    const { toast } = useToast();

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid file',
                description: 'Please select an image of your receipt.',
                variant: 'destructive',
            });
            event.target.value = '';
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleReselect = () => {
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    }
};

    const handleRemove = () => {
        setSelectedFile(null);
        setPreviewUrl('');

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);

        try {
            // Temporary mocked parse delay.
            // Replace with POST /api/import/receipt when the backend endpoint is available.
            await new Promise((resolve) => setTimeout(resolve, 1500));

            toast({
                title: 'Receipt ready',
                description: 'Receipt image was submitted for parsing.',
            });
        } catch (error) {
            console.error('Receipt upload failed:', error);

            toast({
                title: 'Upload failed',
                description: 'Unable to process the receipt. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="mt-3">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
            />

            {!selectedFile ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full gap-2"
                >
                    <Camera className="h-4 w-4" />
                    Add via Receipt
                </Button>
            ) : (
                <div className="space-y-3">
                    <div className="overflow-hidden rounded-md border bg-muted/20">
                        <img
                            src={previewUrl}
                            alt="Selected receipt preview"
                            className="max-h-64 w-full object-contain"
                        />
                    </div>

                    {isUploading && (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleReselect}
                            disabled={isUploading}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Re-select
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={handleUpload}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Parsing...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Receipt
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemove}
                            disabled={isUploading}
                        >
                            Remove
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceiptCapture;