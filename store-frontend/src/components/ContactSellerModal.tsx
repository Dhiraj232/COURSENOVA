"use client";

import { useState } from "react";
import { Book } from "@/types";
import { X, Mail, Copy, Check } from "lucide-react";

interface ContactSellerModalProps {
    book: Book;
    onClose: () => void;
}

export default function ContactSellerModal({ book, onClose }: ContactSellerModalProps) {
    const [copied, setCopied] = useState(false);

    // In a real application we would use an in-app messaging system.
    // For V1, we will show the seller's email.
    const sellerEmail = book.seller?.email || "seller@example.com";

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(sellerEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <img
                            src={book.seller?.profilePicture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                            alt={book.seller?.name}
                            className="w-16 h-16 rounded-full border border-gray-200 object-cover"
                        />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{book.seller?.name}</h2>
                            <p className="text-sm text-gray-500">{book.seller?.collegeName || "Local Student"}</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-8">
                        <h3 className="text-sm font-semibold text-blue-800 mb-1">Interested in buying:</h3>
                        <p className="font-bold text-gray-900 text-lg line-clamp-1">{book.title}</p>
                        <p className="text-blue-600 font-extrabold mt-1">₹{book.price}</p>
                    </div>

                    <div className="space-y-4">
                        <p className="text-gray-700 text-sm font-medium text-center mb-4">
                            Reach out to the seller directly via email to arrange the purchase.
                        </p>

                        <a
                            href={`mailto:${sellerEmail}?subject=Interested in buying: ${encodeURIComponent(book.title)} on RENVOX`}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-white font-bold hover:bg-blue-700 transition duration-200 shadow-md hover:shadow-lg"
                        >
                            <Mail className="h-5 w-5" />
                            Send an Email
                        </a>

                        <button
                            onClick={handleCopyEmail}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-4 text-gray-700 font-bold hover:bg-gray-50 transition duration-200"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-5 w-5 text-green-500" />
                                    <span className="text-green-600">Email Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-5 w-5" />
                                    Copy Email Address
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
