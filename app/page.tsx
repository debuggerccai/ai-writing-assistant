import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import DotGrid from '@/components/dot-grid'
import { StarsIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'

export default function Home() {
    return (
        <div className="w-full h-full overflow-x-hidden overflow-y-auto">
            <section className="flex items-center justify-center h-screen w-screen relative">
                <div className="pointer-events-none absolute top-0 inset-0 z-[-1] h-screen">
                    <DotGrid
                        className="bg-black"
                        dotSize={5}
                        gap={15}
                        baseColor="#271E37"
                        activeColor="#5227FF"
                        proximity={120}
                        shockRadius={250}
                        shockStrength={5}
                        resistance={750}
                        returnDuration={1.5}
                    />
                </div>
                <div className="flex flex-col items-center justify-center gap-6 text-white">
                    <h1 className="text-[clamp(48px,4vw,96px)] font-bold relative">
                        笔走龙蛇，胥助灵光
                        <StarsIcon className="absolute top-2 -left-14 size-10 text-[#5227FF]" />
                    </h1>
                    <p className="text-lg text-[clamp(16px,1vw,24px)]">AI 赋能的深度写作助手，为您构建宏大的故事世界。</p>
                    <div className="flex gap-4">
                        <Link href="/novels">
                            <Button className="text-black" variant="outline" size="lg">
                                开启创作之路
                                <ArrowRight />
                            </Button>
                        </Link>
                        <Button className="bg-white/5 hover:bg-white/5 border border-white/10 text-white/50 hover:text-white backdrop-blur-sm" variant="outline" size="lg">
                            了解更多
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    )
}