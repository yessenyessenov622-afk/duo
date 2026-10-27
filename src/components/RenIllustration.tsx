/** A transparent, layered sitting fox. Parts remain separate for character animation. */
export function RenIllustration({ accessory = "none" }: { accessory?: string }) {
  return <svg className="mascot-illustration ren-illustration" viewBox="0 0 360 420" role="img" aria-label="Рэн, рыжий лисёнок сидит, обняв пушистый хвост">
    <defs>
      <linearGradient id="ren-fur" x1=".1" y1=".05" x2=".85" y2=".9"><stop stopColor="#ffb05f"/><stop offset=".46" stopColor="#ef843d"/><stop offset="1" stopColor="#cc5b31"/></linearGradient>
      <linearGradient id="ren-face" x1=".2" y1=".08" x2=".8" y2=".95"><stop stopColor="#ffc078"/><stop offset=".58" stopColor="#f19149"/><stop offset="1" stopColor="#dc6b38"/></linearGradient>
      <linearGradient id="ren-cream" x1=".2" y1="0" x2=".8" y2="1"><stop stopColor="#fffaf0"/><stop offset="1" stopColor="#f2dfc7"/></linearGradient>
      <linearGradient id="ren-tail" x1=".2" y1=".1" x2=".8" y2=".9"><stop stopColor="#ffb263"/><stop offset=".55" stopColor="#e97839"/><stop offset="1" stopColor="#c95330"/></linearGradient>
      <radialGradient id="ren-light" cx="35%" cy="22%" r="78%"><stop stopColor="#fff" stopOpacity=".55"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></radialGradient>
      <filter id="ren-soft-shadow" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <ellipse cx="179" cy="390" rx="112" ry="13" fill="#563c32" opacity=".14" filter="url(#ren-soft-shadow)"/>

    <g className="ren-tail-part part-tail">
      <path d="M203 322c34 20 91 22 119-3 31-27 30-75 5-97-23-20-60-12-68 13-5 16 5 32 20 35 11 2 21-5 22-16 11 18 2 42-17 52-23 12-51 3-70-18l-18-20-20 31z" fill="url(#ren-tail)"/>
      <path d="M280 226c21-13 47-5 55 14 11 26-3 58-23 74-15 12-38 18-59 12 23-8 39-22 45-39 5-15 0-28-10-31-15-4-23 14-11 23-18-1-29-19-24-35 4-9 13-15 27-18Z" fill="url(#ren-cream)"/>
      <path d="M224 317c26 13 54 14 78 4" fill="none" stroke="#ffcf91" strokeWidth="7" strokeLinecap="round" opacity=".42"/>
    </g>

    <g className="ren-body-part part-body">
      <path d="M99 255c8-34 38-57 78-60 45-3 83 24 94 66 11 43-9 91-44 110-31 17-92 15-127-7-37-23-45-70-20-109 5 0 12 0 19 0Z" fill="url(#ren-fur)"/>
      <path d="M152 230c28 6 53 27 61 54 9 31-2 66-27 84-22 15-54 16-78 5 21-11 28-32 22-53-8-26-24-41-31-51 10-22 29-35 53-39Z" fill="url(#ren-cream)"/>
      <path d="M106 314c-4 23 9 44 31 51 14 5 30 5 42 0-4 18-22 29-45 27-28-3-47-22-44-48 1-12 7-23 16-30Z" fill="url(#ren-fur)"/>
      <path d="M191 350c19 3 35-5 44-17 9 11 9 29-1 42-11 15-34 19-53 9-9-5-15-13-17-21 10-3 19-7 27-13Z" fill="url(#ren-fur)"/>
      <path d="M112 311c10 14 23 23 38 28m43-1c11-3 19-8 26-15" fill="none" stroke="#bf5c36" strokeWidth="3" strokeLinecap="round" opacity=".3"/>
      <path d="M125 247c15-12 34-18 53-18" fill="none" stroke="url(#ren-light)" strokeWidth="17" strokeLinecap="round" opacity=".6"/>
    </g>

    {accessory === "halo" && <ellipse className="mascot-accessory-svg" cx="180" cy="27" rx="55" ry="10" fill="none" stroke="#e5bc59" strokeWidth="6"/>}

    <g className="ren-ears-part part-ears">
      <path className="ren-ear ren-ear-left" d="M90 119 67 34c-3-12 9-19 19-11l64 53-60 43Z" fill="url(#ren-fur)"/>
      <path d="m96 91-15-47 42 34-27 13Z" fill="#b94e38" opacity=".82"/>
      <path className="ren-ear ren-ear-right" d="m216 77 64-54c10-9 22-1 19 11l-22 87-61-44Z" fill="url(#ren-fur)"/>
      <path d="m238 78 42-35-15 48-27-13Z" fill="#b94e38" opacity=".82"/>
    </g>

    <g className="ren-head-part part-head">
      <path d="M69 139c0-51 43-84 108-84 62 0 108 34 108 86 0 50-35 94-91 106-54 11-106-12-119-52-4-12-6-30-6-56Z" fill="url(#ren-face)"/>
      <path d="M80 157c14-24 36-37 63-39 20-1 34 7 39 19-12 12-24 20-37 27-20 12-42 19-63 17-7-6-8-15-2-24Z" fill="#ffe1b5" opacity=".88"/>
      <path d="M200 137c7-13 22-20 41-18 16 2 29 10 38 24 4 7 3 15-3 20-24 2-47-6-68-26-4 0-7 0-8 0Z" fill="#ffe1b5" opacity=".88"/>
      <path d="M84 173c17 27 44 41 78 43 35 2 65-10 87-35-4 29-28 52-63 60-39 9-82-1-99-25-9-13-11-29-3-43Z" fill="url(#ren-cream)"/>
      <path d="M77 125c15-23 41-39 70-41" fill="none" stroke="#ffd091" strokeWidth="10" strokeLinecap="round" opacity=".42"/>
      <g className="ren-eyes part-eyes">
        <path d="M111 142c9-13 25-13 34 0-4 13-11 19-18 19-8 0-14-7-16-19Z" fill="#53382f"/>
        <path d="M216 142c9-13 25-13 34 0-4 13-11 19-18 19-8 0-14-7-16-19Z" fill="#53382f"/>
        <ellipse cx="127" cy="146" rx="3.5" ry="6" fill="#fffaf1"/><ellipse cx="232" cy="146" rx="3.5" ry="6" fill="#fffaf1"/>
        <path d="M102 130c12-9 27-11 42-5m58 5c13-8 28-8 41 1" fill="none" stroke="#ab5639" strokeWidth="4" strokeLinecap="round" opacity=".65"/>
      </g>
      <path d="M164 171c5-5 12-5 17 0l-8 9-9-9Z" fill="#684238"/>
      <path d="M173 180c-1 10-9 14-17 11m17-11c2 10 10 14 18 11" fill="none" stroke="#845343" strokeWidth="3" strokeLinecap="round"/>
      <path d="M90 174c-10 1-17 6-20 13m208-15c10 1 17 6 20 13" fill="none" stroke="#de8050" strokeWidth="3" strokeLinecap="round" opacity=".58"/>
      {accessory === "glasses" && <g className="mascot-accessory-svg" fill="none" stroke="#61505a" strokeWidth="4"><path d="M96 137q4-15 18-15h20q14 0 15 17-2 19-18 20h-17q-17-2-18-22Zm102 2q2-17 17-17h20q15 1 16 17-2 18-18 20h-17q-16-1-18-20Zm-49 0h54"/></g>}
      {accessory === "star" && <path className="mascot-accessory-svg" d="m258 81 7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2Z" fill="#f3c95e"/>}
    </g>

    {accessory === "scarf" && <g className="mascot-accessory-svg"><path d="M106 232c23 13 69 20 112 1l-2 20c-34 20-82 13-112-3Z" fill="#d87887"/><path d="m184 245 26 4-7 36-19-6Z" fill="#e8929d"/><path d="M113 236c26 13 66 18 98 5" fill="none" stroke="#f4b1b7" strokeWidth="4" strokeLinecap="round" opacity=".8"/></g>}

    <g className="ren-paws-part part-paws">
      <path d="M130 281c-16 12-19 30-8 39 10 8 28 4 42-10l-7-26c-8-8-18-9-27-3Z" fill="url(#ren-cream)"/>
      <path d="M190 285c13 10 17 27 8 36-10 9-28 6-42-7l5-25c8-9 19-11 29-4Z" fill="url(#ren-cream)"/>
      <path d="M131 309q13 4 25-6m18 2q11 9 24 5" fill="none" stroke="#d6b89a" strokeWidth="2.5" strokeLinecap="round" opacity=".75"/>
    </g>
  </svg>;
}
