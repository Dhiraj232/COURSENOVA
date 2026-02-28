"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/next/link";
import { BookOpen, LogOut, PlusCircle, Search, User } from "lucide-react";

export default function StoreNavbar() {
    const { data: session } = useSession();

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        {/* App Logo */}
                        <Link href="/" className="flex shrink-0 items-center gap-2">
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">RENVOX Store</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:ml-8 md:flex md:space-x-8">
                            <Link href="/browse" className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Browse Books
                            </Link>
                            <Link href="/sell" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                Sell a Book
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {session ? (
                            <>
                                <Link href="/sell" className="hidden sm:inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 transition-colors">
                                    <PlusCircle className="h-4 w-4" />
                                    Post Listing
                                </Link>

                                <div className="relative ml-3 flex items-center gap-4 border-l border-gray-200 pl-4">
                                    <div className="flex items-center gap-2">
                                        <img
                                            className="h-8 w-8 rounded-full border border-gray-200"
                                            src={session.user?.image || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                            alt="User avatar"
                                        />
                                        <span className="text-sm font-medium text-gray-700 hidden md:block">
                                            {session.user?.name?.split(" ")[0]}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => signOut({ callbackUrl: "http://127.0.0.1:5500/index.html" })}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                        title="Sign Out"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <a href="http://127.0.0.1:5500/index.html" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                                    Main Site
                                </a>
                                <Link
                                    href="/login"
                                    className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all"
                                >
                                    Sign In
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
