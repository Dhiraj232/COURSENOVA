"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { endpoints } from "@/lib/api";
import { Book } from "@/types";
import BookCard from "@/components/BookCard";
import { Search, MapPin, Filter } from "lucide-react";

export default function BrowsePage() {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [collegeFilter, setCollegeFilter] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("");

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                setLoading(true);
                // Build query string
                const params = new URLSearchParams();
                if (subjectFilter) params.append("subject", subjectFilter);
                if (collegeFilter) params.append("collegeName", collegeFilter);

                const res = await axios.get(`${endpoints.books.base}?${params.toString()}`);
                setBooks(res.data.data);
            } catch (error) {
                console.error("Error fetching books:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [subjectFilter, collegeFilter]);

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Search & Filter Bar */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                        {/* Search Input */}
                        <div className="relative w-full md:w-96">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                placeholder="Search for books, guides, notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Quick Filters */}
                        <div className="flex w-full md:w-auto gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                            <div className="relative shrink-0">
                                <select
                                    className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                    value={subjectFilter}
                                    onChange={(e) => setSubjectFilter(e.target.value)}
                                >
                                    <option value="">All Subjects</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Mechanical">Mechanical</option>
                                    <option value="Commerce">Commerce</option>
                                    <option value="Medical">Medical</option>
                                </select>
                                <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>

                            <div className="relative shrink-0">
                                <select
                                    className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-10 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                    value={collegeFilter}
                                    onChange={(e) => setCollegeFilter(e.target.value)}
                                >
                                    <option value="">Any Location</option>
                                    <option value="Delhi University">Delhi University</option>
                                    <option value="IIT Bombay">IIT Bombay</option>
                                    <option value="Local College">My College Only</option>
                                </select>
                                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-blue-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Featured Books Near You</h1>
                    <p className="text-gray-600 mt-1">Discover required reading materials from students in your area.</p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <div key={n} className="bg-gray-200 rounded-2xl h-80 w-full"></div>
                        ))}
                    </div>
                ) : filteredBooks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredBooks.map((book) => (
                            <BookCard key={book._id} book={book} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No books found</h3>
                        <p className="mt-1 text-gray-500">Try adjusting your filters or search term.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
