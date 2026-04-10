"use client"
import Link from "next/link";

export default function NavLogo() {
    return (
        <Link href="/" className="flex flex-row items-center">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                胥
            </div>
            <div className="ml-2 flex flex-col">
                <h1 className='text-base font-medium'>
                    笔胥
                    <span className="ml-px text-red-500">BiXu</span>
                </h1>
                <p className='text-xs text-muted-foreground'>你的AI写作助手</p>
            </div>
        </Link>
    )
}
