"use client";

import ColorBends from "./ColorBends";
import DotField from "./DotField";

export function NexusBackground() {
    return (
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
            <div className="absolute inset-0">
                <ColorBends
                    colors={["#A855F7"]}
                    speed={0.2}
                    frequency={1.0}
                    noise={0.15}
                    bandWidth={0.14}
                    rotation={90}
                    iterations={1}
                    intensity={1.3}
                />
            </div>

            <div className="absolute inset-0">
                <DotField
                    dotRadius={1.5}
                    dotSpacing={14}
                    cursorRadius={500}
                    cursorForce={0.10}
                    bulgeOnly={true}
                    bulgeStrength={67}
                    glowRadius={160}
                    sparkle={false}
                    waveAmplitude={0}
                />
            </div>
        </div>
    );
}