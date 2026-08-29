import React from "react";

interface SummaryCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
}

export default function SummaryCard({
    title,
    value,
    icon
}: SummaryCardProps) {

    return (

        <div
            className="
            rounded-xl
            border
            border-[#020B2D]/10
            bg-white
            px-4
            py-3
            shadow-sm
            flex
            items-center
            justify-between
            transition
            hover:shadow-md
            "
        >

            <div>

                <p className=" text-xs text-gray-500 font-medium" >
                    {title}
                </p>


                <h3
                    className="
                    text-2xl
                    font-bold
                    text-[#020B2D]
                    mt-1
                    "
                >
                    {value}
                </h3>

            </div>


            <div
               className="h-9  w-9 rounded-lg bg-[#FF4B1F]/10 flex items-center justify-center  text-[#FF4B1F] " >           
                {icon}
            </div>


        </div>

    );
}