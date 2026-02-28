import { Book } from "@/types";
import { BookOpen, MapPin, User as UserIcon } from "lucide-react";

interface BookCardProps {
    book: Book;
}

export default function BookCard({ book }: BookCardProps) {
    // Use first image or a placeholder
    const imageUrl = book.images?.[0] || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop";

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="aspect-[4/3] w-full overflow-hidden bg-gray-200">
                <img
                    src={imageUrl}
                    alt={book.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-900 shadow-sm backdrop-blur-sm">
                    {book.condition}
                </div>
            </div>

            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 line-clamp-1 text-lg">{book.title}</h3>
                        <div className="mt-1 flex items-center text-sm text-gray-500 font-medium">
                            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                            {book.subject}
                        </div>
                    </div>
                    <div className="text-xl font-extrabold text-blue-600">
                        ₹{book.price}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex-1 flex flex-col justify-end">
                    <div className="flex items-center text-xs text-gray-600 mb-2">
                        <UserIcon className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate">{book.seller?.name || "Student Seller"}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <MapPin className="mr-1.5 h-4 w-4 text-blue-500 shrink-0" />
                        <span className="truncate font-medium text-gray-700">{book.collegeName}</span>
                    </div>
                </div>

                <button className="mt-4 w-full rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-600 hover:text-white">
                    View Details
                </button>
            </div>
        </div>
    );
}
