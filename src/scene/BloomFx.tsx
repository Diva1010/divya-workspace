import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { BlendFunction, type BloomEffect } from 'postprocessing'
import { HalfFloatType } from 'three'
import { BLOOM } from './lightingPresets'
import { runtime } from './runtime'

export default function BloomFx() {
  const bloom = useRef<BloomEffect>(null)
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = runtime.env.bloom
  })
  return (
    <EffectComposer frameBufferType={HalfFloatType} multisampling={BLOOM.multisampling}>
      <Bloom
        ref={bloom}
        intensity={0}
        luminanceThreshold={BLOOM.threshold}
        luminanceSmoothing={BLOOM.smoothing}
        mipmapBlur={BLOOM.mipmapBlur}
        radius={BLOOM.radius}
        levels={BLOOM.levels}
        blendFunction={BlendFunction.SCREEN}
      />
    </EffectComposer>
  )
}
