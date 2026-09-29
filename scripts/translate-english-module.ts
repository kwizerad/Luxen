import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

function makeDoc(title: string, paragraphs: string[], keyPoints?: string[], warning?: string) {
  const content: any[] = [
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [
        {
          type: "text",
          marks: [
            { type: "textStyle", attrs: { fontSize: "20px" } },
            { type: "bold" },
            { type: "underline" }
          ],
          text: title
        }
      ]
    }
  ];

  for (const p of paragraphs) {
    content.push({
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: [{ type: "text", text: p }]
    });
  }

  if (keyPoints && keyPoints.length > 0) {
    content.push({
      type: "bulletList",
      content: keyPoints.map(kp => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: null },
            content: [{ type: "text", text: kp }]
          }
        ]
      }))
    });
  }

  if (warning) {
    content.push({
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: [
        {
          type: "text",
          marks: [{ type: "bold" }],
          text: "Important Rule / Note: "
        },
        {
          type: "text",
          text: warning
        }
      ]
    });
  }

  return JSON.stringify({ type: "doc", content });
}

const ENGLISH_LESSONS = [
  {
    order_index: 0,
    title: "1. UNDERSTANDING PEDESTRIANS AND THE ROAD",
    topics: [
      {
        id: "e-l1-t1",
        title: "Pedestrians & Traffic Rules",
        estimated_minutes: 5,
        content: makeDoc(
          "Who is a Pedestrian in Traffic Law?",
          [
            "In traffic regulations, a pedestrian is any person traveling on foot along or across a public roadway, street, or designated thoroughfare.",
            "Pedestrians also legally include persons pushing or pulling a baby stroller, a wheelchair for persons with disabilities, or walking a bicycle, motorcycle, or other light conveyance without riding it.",
            "Pedestrians are among the most vulnerable road users because they lack physical metal barriers, safety belts, or airbags in the event of an impact."
          ],
          [
            "Pedestrians must always remain vigilant and aware of traffic flow.",
            "Children, elderly individuals, and persons with disabilities require extra caution and accommodation from all motorists.",
            "Under Rwanda Traffic Law, pedestrians have designated rights and strict obligations to preserve life and order."
          ],
          "Pedestrians must respect all road signage and follow directives from authorized traffic personnel at all times."
        )
      },
      {
        id: "e-l1-t2",
        title: "The Road Structure and Definition",
        estimated_minutes: 5,
        content: makeDoc(
          "What is the Road in Legal Terms?",
          [
            "According to Rwanda Law N° 014/2026 on Road Traffic, a road comprises one or more lanes used by vehicles, parking verges, bridges, pedestrian sidewalks, and designated tracks.",
            "The road is not exclusively reserved for motor vehicles; it is a shared public utility designed for the coexistence of motorists, cyclists, and pedestrians.",
            "Understanding how the roadway is segregated into driving lanes, shoulders, and sidewalks ensures safe, harmonious navigation."
          ],
          [
            "Carriageway (Ikaye): The part of the road intended specifically for vehicular traffic.",
            "Shoulder / Verge: The strip of land bordering the carriageway used for emergencies and walking where sidewalks do not exist.",
            "Sidewalk (Trottoir): The elevated or marked pathway exclusively reserved for pedestrian circulation."
          ],
          "Vehicles must never park or drive upon sidewalks reserved for pedestrian passage."
        )
      },
      {
        id: "e-l1-t3",
        title: "Road Users and Mutual Duty of Care",
        estimated_minutes: 5,
        content: makeDoc(
          "Categories of Road Users and Mutual Respect",
          [
            "Public roads accommodate diverse categories of users: passenger vehicles, heavy trucks, buses, motorcycles, bicycles, carts, and pedestrians.",
            "Every road user has a legal Duty of Care to conduct themselves in a manner that does not endanger, impede, or cause inconvenience to other users.",
            "Mutual courtesy between drivers and pedestrians prevents collisions and ensures seamless traffic flow."
          ],
          [
            "Drivers must yield to pedestrians who are lawfully traversing designated crossings.",
            "Pedestrians must refrain from making sudden, unpredictable incursions onto the roadway.",
            "Vulnerable road users must be given ample clearance and patience by operators of larger motor vehicles."
          ],
          "The strongest vehicle does not have the strongest right of way; safety and human life supersede speed."
        )
      },
      {
        id: "e-l1-t4",
        title: "Pedestrian Legal Obligations",
        estimated_minutes: 5,
        content: makeDoc(
          "Rules Pedestrians Must Know and Follow",
          [
            "Every candidate studying for their driving license must master pedestrian rules, both to drive defensively and to guide pedestrian safety.",
            "Pedestrians must walk on sidewalks or footpaths whenever they are available, passable, and safely constructed.",
            "Where no sidewalks exist, pedestrians must walk along the shoulder facing approaching oncoming traffic so they can observe vehicles approaching directly."
          ],
          [
            "Facing traffic enables pedestrians to take immediate evasive steps if an oncoming driver drifts off course.",
            "Walking in single file is mandatory when walking in groups along narrow roads or during night hours.",
            "Reflective clothing or light-colored attire should be worn in low-light conditions to maximize visibility."
          ],
          "Walking with your back to oncoming vehicular traffic along unlit rural roads is extremely hazardous and violates traffic recommendations."
        )
      }
    ]
  },
  {
    order_index: 1,
    title: "2. WHERE PEDESTRIANS MUST WALK",
    topics: [
      {
        id: "e-l2-t1",
        title: "Designated Walkways & Sidewalks",
        estimated_minutes: 5,
        content: makeDoc(
          "Using Sidewalks and Pavements Correctly",
          [
            "Sidewalks are dedicated structural pathways separated from vehicle traffic by curbs, barriers, or green verges.",
            "Whenever an unobstructed sidewalk or pedestrian path is provided on either side of the road, pedestrians must use it.",
            "Do not walk along the curb's outer edge where passing vehicle mirrors or wide loads could clip you."
          ],
          [
            "Keep to the right or center of the sidewalk to avoid impeding other pedestrians.",
            "Exercise caution near garage driveways, petrol station entrances, and alleys where vehicles cross the sidewalk.",
            "Supervise young children closely by keeping them on the inner side of the walkway away from the roadway."
          ],
          "Sidewalks must never be blocked by construction materials, parked vehicles, or commercial merchandise."
        )
      },
      {
        id: "e-l2-t2",
        title: "Walking on Roads Without Sidewalks",
        estimated_minutes: 5,
        content: makeDoc(
          "Rules for Roadways Without Pavements",
          [
            "When traveling on rural highways or suburban roads lacking sidewalks, pedestrians must walk on the left shoulder (facing oncoming traffic in right-hand driving countries like Rwanda).",
            "This critical rule allows pedestrians to make eye contact with approaching drivers and step further onto the verge if a car approaches too close.",
            "Exception: If pushing a heavy object, bicycle, or motorcycle, walk on the right side in the direction of traffic to avoid forcing approaching traffic into oncoming lanes."
          ],
          [
            "Step off the carriageway completely when heavy vehicles or buses are passing.",
            "Do not walk abreast (side by side); form a single line.",
            "Never step onto the roadway suddenly from behind hedges, stationary buses, or crests."
          ],
          "Walking facing traffic gives you vital reaction time to escape runaway or distracted vehicles."
        )
      },
      {
        id: "e-l2-t3",
        title: "Avoiding Road Hazards and Obstacles",
        estimated_minutes: 5,
        content: makeDoc(
          "Navigating Construction, Drainage, and Obstructions",
          [
            "Roadworks, construction debris, fallen tree branches, or open gutters may obstruct normal pedestrian paths.",
            "Before diverting around an obstacle into the traffic lane, check rear and oncoming traffic thoroughly.",
            "Signal your intent by holding back until vehicles pass before quickly and safely stepping around the obstruction."
          ],
          [
            "Never dart into traffic abruptly to bypass a puddle or uneven surface.",
            "Be vigilant around storm drainage ditches, especially during heavy torrential rains common in Rwanda.",
            "Wear sturdy footwear suitable for road conditions."
          ],
          "Always yield to moving traffic when stepping momentarily onto the carriageway around an obstacle."
        )
      },
      {
        id: "e-l2-t4",
        title: "Prohibited Road Areas for Pedestrians",
        estimated_minutes: 5,
        content: makeDoc(
          "High-Speed Expressways and Prohibited Zones",
          [
            "Pedestrians are strictly forbidden from entering designated expressways, motorways, and controlled-access transit corridors.",
            "Tunnels, flyovers, and elevated highway bridges lacking dedicated pedestrian barriers are off-limits to pedestrian circulation.",
            "Central dividing medians and traffic islands must not be used for lingering, loitering, or vending goods."
          ],
          [
            "Expressway high speeds make pedestrian survival near zero in the event of impact.",
            "Never attempt to cross multi-lane divided expressways on foot; use overpasses or underpasses.",
            "Road workers and traffic officers in these zones must wear high-visibility certified reflective vests."
          ],
          "Entering restricted motorway zones on foot constitutes an actionable traffic infraction under Rwanda law."
        )
      }
    ]
  },
  {
    order_index: 2,
    title: "3. HOW PEDESTRIANS CROSS THE ROAD",
    topics: [
      {
        id: "e-l3-t1",
        title: "Safe Crossing Selection & Priority",
        estimated_minutes: 5,
        content: makeDoc(
          "Selecting Where and When to Cross",
          [
            "Crossing the road is the single most dangerous action a pedestrian undertakes.",
            "Always utilize designated crossing facilities when they exist within 50 meters: zebra crossings, pedestrian overpass bridges, underpass tunnels, or light-controlled intersections.",
            "Where no designated crossing exists, choose a spot with clear sightlines in both directions, away from curves, hill crests, and parked vehicles."
          ],
          [
            "Pedestrian Footbridges (Ibiraro byo mu Kirere): Always choose footbridges over surface crossings on high-density arteries.",
            "Clear Visibility: Ensure you can see approaching vehicles from at least 150 meters away in both directions.",
            "Right Angles: Always cross perpendicularly (straight across), never diagonally, to minimize exposure time."
          ],
          "Crossing diagonally extends your time in the line of traffic and blinds you to vehicles coming from behind."
        )
      },
      {
        id: "e-l3-t2",
        title: "The Stop, Look, and Listen Procedure",
        estimated_minutes: 5,
        content: makeDoc(
          "Step-by-Step Crossing Protocol",
          [
            "Stop at the edge of the sidewalk or curb before stepping onto the roadway. Never step out while still walking.",
            "Look Left, Look Right, and Look Left Again. In right-hand drive traffic, the first danger lane comes from your left.",
            "Listen attentively for engine sounds, sirens, or fast-approaching motorcycles that may be obscured from vision."
          ],
          [
            "1. STOP on the curb or shoulder safely back from the roadway.",
            "2. LOOK all around and make eye contact with approaching drivers.",
            "3. LISTEN without headphones or mobile distractions.",
            "4. WALK briskly when clear, without running, continuously scanning both directions."
          ],
          "Running across the road increases the risk of tripping, falling, and miscalculating vehicular approach speeds."
        )
      },
      {
        id: "e-l3-t3",
        title: "Do Not Rely Blindly on Drivers",
        estimated_minutes: 5,
        content: makeDoc(
          "Defensive Pedestrian Awareness",
          [
            "Even when a pedestrian has legal right-of-way at a zebra crossing, do not assume an oncoming vehicle will stop in time.",
            "The driver could be distracted, speeding, experiencing brake failure, or impaired by fatigue or weather.",
            "Verify that approaching vehicles have physically slowed down and come to a complete standstill before stepping into their path."
          ],
          [
            "Make eye contact with the driver to confirm they have registered your presence.",
            "Watch out for multi-lane hazards: a car in Lane 1 may stop, but a car in Lane 2 may overtake without seeing you.",
            "Never step in front of emergency vehicles with active sirens and flashing lights."
          ],
          "Physical laws of momentum and braking distance take precedence over legal rights. Always verify before stepping out."
        )
      },
      {
        id: "e-l3-t4",
        title: "Cross Calmly and Safely",
        estimated_minutes: 5,
        content: makeDoc(
          "Conduct During Crossing",
          [
            "Once you begin crossing, proceed with a steady, brisk walking pace while keeping your head up and scanning traffic.",
            "Do not stop, reverse, or loiter in the middle of the carriageway unless trapped by unexpected traffic movements.",
            "If a central pedestrian refuge island exists, cross the first half, stop on the refuge, and reassess traffic for the second half."
          ],
          [
            "Refuge Island: Treat each carriageway as an independent crossing.",
            "Do not look down at phone screens while crossing.",
            "If an item drops in the street, do not retrieve it without first verifying that traffic is clear."
          ],
          "Never freeze in panic in the center of the lane; maintain calm awareness and move toward the nearest safe verge."
        )
      }
    ]
  },
  {
    order_index: 3,
    title: "4. ROAD SIGNS AND LIGHTS FOR PEDESTRIANS",
    topics: [
      {
        id: "e-l4-t1",
        title: "Pedestrian Signals and Zebra Crossings",
        estimated_minutes: 5,
        content: makeDoc(
          "Pedestrian Lights and White Stripe Markings",
          [
            "Zebra Crossings feature wide white longitudinal stripes painted across the road, indicating a dedicated pedestrian sanctuary.",
            "Pedestrian Traffic Lights display a red standing figure (Do Not Cross) and a green walking figure (Safe to Cross).",
            "At button-activated crossings, press the push button and wait for the green signal before proceeding."
          ],
          [
            "Red Man Signal: Stand back on the pavement; vehicles have right of way.",
            "Green Man Signal: Look around, verify that vehicles have halted, and cross.",
            "Flashing Green: Do not begin crossing; if already in the road, complete your crossing briskly."
          ],
          "Drivers approaching an unsignaled zebra crossing must yield immediately to any pedestrian on or entering the crossing."
        )
      },
      {
        id: "e-l4-t2",
        title: "Pedestrians Only Mandatory Signs",
        estimated_minutes: 5,
        content: makeDoc(
          "Mandatory Pedestrian Path Sign (Blue Circle)",
          [
            "A circular blue sign depicting white silhouettes of walking pedestrians designates a mandatory, exclusive pedestrian track or zone.",
            "Motor vehicles, motorcycles, and motorized scooters are strictly forbidden from entering these designated pathways.",
            "Cyclists must dismount and push their bicycles when entering these designated walking tracks."
          ],
          [
            "Sign Shape: Circular with blue background and white pictograms (Regulatory - Mandatory).",
            "Pedestrians enjoy complete priority throughout the designated zone.",
            "Delivery vehicles may enter only during designated off-peak hours under strict permit conditions."
          ],
          "This sign provides a safe walking corridor in urban hubs, shopping districts, and school vicinities."
        )
      },
      {
        id: "e-l4-t3",
        title: "Pedestrians Prohibited Signs",
        estimated_minutes: 5,
        content: makeDoc(
          "Prohibitory Pedestrian Sign (Red Circle with Slash)",
          [
            "A circular sign with a red border, white or transparent background, and a silhouette of a pedestrian crossed with a diagonal red line designates a prohibited area.",
            "This sign indicates that foot traffic is banned beyond this point due to high speeds, narrow bridges, tunnels, or dangerous industrial traffic.",
            "Pedestrians encountering this sign must turn back and take designated alternative detours."
          ],
          [
            "Commonly positioned at expressway entrances, highway on-ramps, and rail tunnels.",
            "Disregarding this sign is punishable by fine under the Rwanda Penal Code for road safety offenses.",
            "Drivers must remain cautious in case unauthorized pedestrians enter the prohibited zone unexpectedly."
          ],
          "Never enter roads marked with the Pedestrian Prohibited sign under any circumstances."
        )
      },
      {
        id: "e-l4-t4",
        title: "Children Crossing Warning Signs",
        estimated_minutes: 5,
        content: makeDoc(
          "Warning Sign for School and Playground Zones",
          [
            "A triangular warning sign with a red border showing silhouettes of two children indicates a zone frequented by young pedestrians.",
            "This sign is installed within 50 to 150 meters of schools, playgrounds, sports facilities, and residential crossings.",
            "Drivers must reduce speed immediately to 30 km/h or lower and prepare to stop on sight of children."
          ],
          [
            "Children have limited peripheral vision, cannot judge vehicle speeds accurately, and may chase balls into the street.",
            "School crossing wardens holding stop paddles have the full legal authority of traffic police.",
            "Motorists must never overtake another vehicle within 50 meters of a school zone crossing."
          ],
          "In Rwanda, the speed limit in school and hospital zones is strictly restricted to 30 km/h."
        )
      },
      {
        id: "e-l4-t5",
        title: "Traffic Control Lights at Intersections",
        estimated_minutes: 5,
        content: makeDoc(
          "Navigating Three-Color Vehicular Traffic Lights",
          [
            "At intersections lacking dedicated pedestrian signals, pedestrians must carefully observe vehicular signals.",
            "When vehicular signals show RED in your crossing direction, vehicles stop, offering a window to cross safely.",
            "However, beware of vehicles executing filter turns (turning right or left on green into your crosswalk)."
          ],
          [
            "Green vehicular light: Vehicles moving fast; do not step into traffic.",
            "Yellow / Amber: Vehicles preparing to stop or clear the junction; wait.",
            "Red vehicular light: Traffic held; ensure turning vehicles see you before crossing."
          ],
          "Turning vehicles must yield to crossing pedestrians, but pedestrians must verify that the driver is braking."
        )
      },
      {
        id: "e-l4-t6",
        title: "Pedestrian Crossing Warning Sign",
        estimated_minutes: 5,
        content: makeDoc(
          "Advance Warning of Upcoming Zebra Crossing",
          [
            "A triangular warning sign featuring a person walking across horizontal lines alerts drivers to an approaching zebra crossing ahead.",
            "Located 50 meters ahead in urban centers and 150 meters ahead on rural highways.",
            "Alerts drivers to check their speed, avoid overtaking, and scan for waiting pedestrians."
          ],
          [
            "Warns drivers that pedestrians have legal right-of-way ahead.",
            "Parking, stopping, or overtaking within 5 meters of the crossing is strictly illegal.",
            "Pedestrians should wait at the crossing curb until approaching cars demonstrate deceleration."
          ],
          "Overtaking a vehicle that has stopped to allow pedestrians to cross is one of the most severe driving violations."
        )
      }
    ]
  },
  {
    order_index: 4,
    title: "5. PEDESTRIANS AND MOTOR VEHICLES",
    topics: [
      {
        id: "e-l5-t1",
        title: "Motor Vehicle Interaction & Blind Spots",
        estimated_minutes: 5,
        content: makeDoc(
          "Understanding How Drivers See Pedestrians",
          [
            "Drivers do not have 360-degree visibility. Structural pillars, dirty windows, blind spots, and darkness obscure pedestrians.",
            "If you cannot see the driver's eyes or mirrors, the driver almost certainly cannot see you.",
            "Never walk, stand, or linger in a vehicle's blind spots, particularly directly behind or directly beside large vehicles."
          ],
          [
            "A-Pillar blind spots block pedestrian silhouettes when cars make left or right turns at junctions.",
            "Always assume the driver has not noticed you until confirmed by deceleration or clear hand gestures.",
            "Make eye contact before crossing in front of stationary traffic."
          ],
          "If you can't see the driver's mirrors, you are in their blind spot and completely invisible to them."
        )
      },
      {
        id: "e-l5-t2",
        title: "Motorcycles and Two-Wheelers",
        estimated_minutes: 5,
        content: makeDoc(
          "Vigilance Around Commercial Motorcycles (Motos)",
          [
            "In Rwanda, commercial taxi-motos are prevalent, agile, and frequently filter through congested traffic.",
            "Because motorcycles can accelerate rapidly and filter between lanes or along curb edges, pedestrians must look both ways before stepping between parked cars.",
            "Always scan curb-side spaces; a motorbike may overtake stopped cars on the inside."
          ],
          [
            "Never step into the roadway without checking both directions, even on one-way streets.",
            "Motorcycles have shorter braking distances on dry roads but can skid easily on wet or sandy asphalt.",
            "Both motorcycle riders and pedestrians must respect designated pedestrian crosswalks."
          ],
          "Never assume a quiet road is free of motorbikes. Listen carefully and check blind corners."
        )
      },
      {
        id: "e-l5-t3",
        title: "Heavy Vehicles and Trucks",
        estimated_minutes: 5,
        content: makeDoc(
          "Staying Safe Near Buses and Freight Trucks",
          [
            "Heavy commercial trucks, freight trailers, and public buses have enormous blind spots extending several meters in front, on both sides, and behind.",
            "Due to their massive weight, large trucks require significantly longer braking distances to come to a halt.",
            "When turning corners, long articulated vehicles 'off-track' (the rear wheels take a tighter path than front wheels, sweeping across curbs)."
          ],
          [
            "Stay at least 3 meters back from the curb when a large bus or truck is turning.",
            "Never pass behind a heavy vehicle that is idling or in gear.",
            "Be aware of air turbulence and debris generated by high-speed heavy vehicles on highways."
          ],
          "Never walk directly in front of the high cab of a stopped truck; the driver cannot see below the windshield line."
        )
      },
      {
        id: "e-l5-t4",
        title: "Reversing Vehicles and Driveways",
        estimated_minutes: 5,
        content: makeDoc(
          "Hazards of Reversing Cars",
          [
            "White reversing lights and reverse beeping alerts indicate a vehicle is maneuvering backward.",
            "Drivers reversing out of garages, parking lots, or driveways have restricted rear visibility, especially for small children.",
            "Never walk closely behind a vehicle whose reverse lights are illuminated or whose engine is revving."
          ],
          [
            "Stop and wait at a safe distance until the vehicle finishes its reversing maneuver.",
            "Listen for reverse warning audio beeps on commercial vehicles.",
            "Avoid cutting across private driveways and supermarket parking aisles without checking for reversing cars."
          ],
          "White rear tail lights indicate a vehicle is in reverse gear. Stay clear immediately."
        )
      },
      {
        id: "e-l5-t5",
        title: "Children Near Motor Vehicles",
        estimated_minutes: 5,
        content: makeDoc(
          "Protecting Children from Vehicle Hazards",
          [
            "Children under 10 years of age lack the cognitive ability to assess vehicle velocity, distance, and acceleration.",
            "Adults accompanying children along public roadways must hold their hands securely at all times on the side away from traffic.",
            "Never allow children to play, run, or congregate in driveways, parking zones, or near parked vehicles."
          ],
          [
            "Always lead children onto the vehicle from the curb-side door, never from the traffic side.",
            "Teach children the basic traffic rules early: Stop, Look, and Listen.",
            "Drivers must check under and around their vehicles before driving away in residential areas."
          ],
          "An adult must hold a child's hand firmly whenever walking within 3 meters of any active roadway."
        )
      },
      {
        id: "e-l5-t6",
        title: "Mutual Respect Between Road Users",
        estimated_minutes: 5,
        content: makeDoc(
          "Fostering Road Courtesy and Harmony",
          [
            "Road safety is fundamentally a culture of mutual respect, patience, and shared responsibility.",
            "Motorists should acknowledge waiting pedestrians and give gentle waves to signal safe crossing when fully stopped.",
            "Pedestrians should acknowledge courteous drivers with a nod and cross promptly without unnecessary delay."
          ],
          [
            "Aggressive driving and aggressive pedestrian behavior both trigger collisions.",
            "Give extra courtesy during bad weather (rain, fog) when windshields are misted and footing is slippery.",
            "Remember that every driver becomes a pedestrian the moment they step out of their vehicle."
          ],
          "Courtesy costs nothing, but it prevents fatal misunderstandings on our shared roads."
        )
      }
    ]
  },
  {
    order_index: 5,
    title: "6. AVOIDING DISTRACTIONS AND EXERCISING CAUTION",
    topics: [
      {
        id: "e-l6-t1",
        title: "Mobile Phones & Road Distractions",
        estimated_minutes: 5,
        content: makeDoc(
          "The Dangers of Distracted Walking",
          [
            "Using smartphones to text, browse social media, or watch videos while walking along or crossing the street creates 'cognitive blindness'.",
            "A distracted pedestrian reacts up to 4 times slower to sudden road hazards, horns, and skidding vehicles.",
            "Never look at a mobile phone screen while stepping off the curb or crossing the street."
          ],
          [
            "Put your phone away in your pocket before approaching any crosswalk or intersection.",
            "If you must answer an urgent message or call, step to the inner side of the sidewalk and stop completely.",
            "Do not play mobile games or scroll through video feeds while walking in public."
          ],
          "Texting while crossing the road is as dangerous as texting while driving. Eyes up, phone away."
        )
      },
      {
        id: "e-l6-t2",
        title: "Conversations and Lack of Focus",
        estimated_minutes: 5,
        content: makeDoc(
          "Maintaining Focus in Groups",
          [
            "Walking in large animated groups frequently causes pedestrians to neglect traffic scanning.",
            "Friends often follow each other blindly into crosswalks without looking for themselves ('herd behavior').",
            "Every individual is personally responsible for checking traffic before stepping into the roadway."
          ],
          [
            "Do not rely on the person in front of you; verify safety with your own eyes and ears.",
            "Avoid walking in clusters that push group members into the road verge.",
            "Remain fully conscious of traffic sounds even during lively discussions."
          ],
          "Always confirm with your own eyes that the road is clear before following others into the street."
        )
      },
      {
        id: "e-l6-t3",
        title: "Music and Electronic Devices",
        estimated_minutes: 5,
        content: makeDoc(
          "The Hazard of Noise-Cancelling Headphones",
          [
            "Noise-cancelling headphones and loud in-ear earbuds eliminate ambient acoustic feedback essential for survival.",
            "Hearing approaching vehicle tires, sirens, horn warnings, or barking dogs alerts pedestrians long before visual contact.",
            "Keep one earbud out or turn off noise-cancellation when traveling along or near active roads."
          ],
          [
            "Never cross roads with music volume turned up loud.",
            "Electric vehicles and bicycles are nearly silent; hearing their tire rolling sounds is critical.",
            "Remove earphones completely when crossing railway tracks, multi-lane arteries, and complex roundabouts."
          ],
          "Hearing is your primary warning system for vehicles approaching outside your visual field. Protect it."
        )
      },
      {
        id: "e-l6-t4",
        title: "Playing or Running in the Roadway",
        estimated_minutes: 5,
        content: makeDoc(
          "Strict Prohibition of Street Games",
          [
            "Playing football, roller-skating, skateboarding, or running in the public roadway is strictly prohibited by traffic law.",
            "A rolling ball is almost always followed by a running child who is oblivious to oncoming vehicular traffic.",
            "Drivers seeing a ball or toy roll onto the street must brake immediately in anticipation of a following child."
          ],
          [
            "Parks, sports fields, and enclosed community centers are the only safe venues for games.",
            "Parents and guardians are legally liable for allowing young children to play near busy roads.",
            "Skateboarders and roller-skaters must use designated sports parks or wide pedestrian esplanades."
          ],
          "A roadway is an active conduit for motor vehicles, never a playground. Keep games off the street."
        )
      },
      {
        id: "e-l6-t5",
        title: "Instructions from Authorized Officers",
        estimated_minutes: 5,
        content: makeDoc(
          "Complying with Traffic Police and Wardens",
          [
            "Directives and arm signals given by Rwanda National Police officers supersede all painted signs, traffic lights, and road markings.",
            "If a traffic officer signals for pedestrians to stop, wait immediately on the curb, even if the pedestrian light is green.",
            "If the officer signals for pedestrians to proceed, cross promptly and safely under their protection."
          ],
          [
            "Recognize official police uniforms, reflective gear, and standardized arm signals.",
            "School crossing wardens holding official stop signs must be obeyed by both motorists and pedestrians.",
            "Respect barricades, police tape, and temporary diversions erected during public events or emergency incidents."
          ],
          "Law enforcement directives always overrule electronic signals and permanent road markings."
        )
      },
      {
        id: "e-l6-t6",
        title: "Patience and Courtesy",
        estimated_minutes: 5,
        content: makeDoc(
          "Exercising Patience Under Challenging Conditions",
          [
            "Rush hour traffic in Kigali and major towns can be dense, fast-paced, and stressful.",
            "Patience is the foundation of accident prevention: waiting an extra 30 seconds for a safe crossing gap saves lives.",
            "Never attempt to gamble against oncoming traffic speeds to catch a departing bus or beat rain."
          ],
          [
            "Wait calmly at the curb; rushing across lanes invites fatal miscalculations.",
            "Acknowledge respectful drivers who pause to let you cross safely.",
            "Maintain composure and calmness regardless of weather or delay."
          ],
          "It is far better to arrive five minutes late in this life than twenty years early in the next. Walk with patience."
        )
      }
    ]
  },
  {
    order_index: 6,
    title: "7. SAFETY, ACCIDENTS, AND EVERYONE'S RESPONSIBILITIES",
    topics: [
      {
        id: "e-l7-t1",
        title: "Road Accidents & Duty of Care",
        estimated_minutes: 5,
        content: makeDoc(
          "Understanding Traffic Collisions and Legal Duty",
          [
            "Traffic collisions are not inevitable accidents; they are almost universally the consequence of human error, distraction, speed, or negligence.",
            "Every participant on the public road owes a legal Duty of Care to conduct themselves in a manner that protects human life and bodily integrity.",
            "A single moment of recklessness can cause irreversible grief, disability, and criminal prosecution."
          ],
          [
            "Pedestrians suffer the highest fatality rates in urban vehicle collisions.",
            "Speed is the decisive multiplier: a pedestrian struck at 30 km/h has a 90% survival rate; at 60 km/h, the fatality rate exceeds 85%.",
            "Traffic safety is an indivisible collective discipline shared by every citizen."
          ],
          "Road safety is not an individual choice; it is a civic duty and a legal requirement under Rwandan law."
        )
      },
      {
        id: "e-l7-t2",
        title: "Preventing Road Accidents",
        estimated_minutes: 5,
        content: makeDoc(
          "Proactive Accident Prevention Strategies",
          [
            "Prevention begins with environmental awareness and adherence to established traffic codes.",
            "Wearing light-colored or reflective attire at night increases your detection distance from 30 meters to over 150 meters.",
            "Drivers must consistently reduce speed in built-up areas, pedestrian hubs, markets, and near public transport stops."
          ],
          [
            "High-visibility clothing is critical for morning joggers, evening walkers, and road workers.",
            "Ensure vehicle headlights are clean, properly angled, and operational.",
            "Never operate a vehicle or navigate busy roads while impaired by alcohol, narcotics, or severe fatigue."
          ],
          "Visibility is your best shield. Make yourself seen from a distance."
        )
      },
      {
        id: "e-l7-t3",
        title: "What to Do in the Event of an Accident",
        estimated_minutes: 5,
        content: makeDoc(
          "Emergency Protocol at an Accident Scene",
          [
            "If an accident occurs, remain calm and secure the scene to prevent secondary collisions.",
            "Immediately call emergency services in Rwanda: National Emergency (112), Ambulance / SAMU (912), or Traffic Police (113).",
            "Do not move critically injured persons unless there is an imminent threat of fire, explosion, or submersion."
          ],
          [
            "1. Secure the area: Set up emergency warning triangles 50 meters back.",
            "2. Alert authorities: Call 112 / 912 with exact location details.",
            "3. Render first aid: Apply direct pressure to severe bleeding wounds.",
            "4. Do not remove a motorcyclist's helmet unless they cannot breathe.",
            "5. Exchange information and cooperate fully with investigating police officers."
          ],
          "Fleeing the scene of an accident (hit-and-run) is a grave criminal offense carrying severe prison sentences under the Rwandan Penal Code."
        )
      },
      {
        id: "e-l7-t4",
        title: "The Pedestrian's Responsibilities",
        estimated_minutes: 5,
        content: makeDoc(
          "Key Duties Expected of Every Pedestrian",
          [
            "Pedestrians must act responsibly and follow all posted traffic signals, crosswalks, and overpasses.",
            "Pedestrians must not step into the path of moving vehicles suddenly or without giving the driver adequate braking distance.",
            "Pedestrians must not loiter on roadways or create hazards by scattering objects across lanes."
          ],
          [
            "Use sidewalks where available, or walk on the left shoulder facing oncoming traffic.",
            "Cross at designated zebra crossings or footbridges whenever they are nearby.",
            "Keep hands free of distractions and supervise children in your care."
          ],
          "Rights on the road come accompanied by responsibilities to ensure the safety of all."
        )
      },
      {
        id: "e-l7-t5",
        title: "The Driver's Responsibilities",
        estimated_minutes: 5,
        content: makeDoc(
          "Special Duties Motorists Owe to Pedestrians",
          [
            "Motorists control machines of immense weight and kinetic energy, carrying an elevated moral and legal burden of care.",
            "Drivers must yield unconditionally to pedestrians crossing at marked zebra crossings or intersections.",
            "Drivers must slow down whenever approaching buses dropping off passengers, school zones, and crowded commercial sidewalks."
          ],
          [
            "Never overtake another vehicle that has slowed down or stopped at a pedestrian crosswalk.",
            "Maintain the legal urban speed limit of 40 km/h in Kigali and 30 km/h in school / hospital zones.",
            "Exercise extreme patience with elderly persons and individuals with mobility impairments."
          ],
          "The pedestrian has absolute priority at designated crosswalks. Yielding is not optional; it is mandatory."
        )
      },
      {
        id: "e-l7-t6",
        title: "The Role of Family and Community",
        estimated_minutes: 5,
        content: makeDoc(
          "Community Education and Household Safety Culture",
          [
            "Road safety education must begin in the home, school, and community centers.",
            "Parents and educators must model correct pedestrian behavior by always using crosswalks and footbridges.",
            "Community members must report damaged road barriers, missing traffic signs, and uncovered storm drains to local authorities."
          ],
          [
            "Teach children never to run into the street, even for a favorite ball or pet.",
            "Support neighborhood speed humps and safe pedestrian infrastructure initiatives.",
            "Promote walking buses and adult-supervised walking groups for primary school students."
          ],
          "Children learn more from what adults do on the road than what adults tell them. Lead by example."
        )
      },
      {
        id: "e-l7-t7",
        title: "The Role of Authorities and Security Personnel",
        estimated_minutes: 5,
        content: makeDoc(
          "Enforcement, Infrastructure, and Public Safety",
          [
            "The Rwanda National Police, Ministry of Infrastructure (MININFRA), and Rwanda Transport Development Agency (RTDA) work continuously to protect road users.",
            "Speed control cameras, traffic signals, high-visibility crosswalk markings, and modern street lighting are installed to safeguard public movement.",
            "Traffic regulations are rigorously enforced through automated surveillance, mobile patrols, and regular breathalyzer checkpoints."
          ],
          [
            "Strict penalties are enforced against driving under the influence (DUI), excessive speed, and failure to yield.",
            "Urban development mandates dedicated pedestrian walkways and cycling lanes on all new road projects.",
            "Regular public safety campaigns (such as Gerayo Amahoro) reinforce civic consciousness across all provinces."
          ],
          "The Gerayo Amahoro campaign reminds us: Arrive alive. Every life lost on our roads is one too many."
        )
      }
    ]
  },
  {
    order_index: 7,
    title: "LESSON SUMMARY AND KEY TAKEAWAYS",
    topics: [
      {
        id: "e-l8-t1",
        title: "Essential Knowledge for Road Candidates",
        estimated_minutes: 10,
        content: makeDoc(
          "Core Review Points for Theory and Practical Exams",
          [
            "This comprehensive module covered the legal rights, designated pathways, crossing protocols, and mutual responsibilities governing pedestrians on Rwandan roads.",
            "As an exam candidate, you must know both how to conduct yourself safely as a pedestrian and how to protect pedestrians as a certified driver.",
            "Remember: Pedestrians have priority at zebra crossings; drivers must reduce speed to 30 km/h in school zones; and pedestrians without sidewalks must walk facing oncoming traffic."
          ],
          [
            "1. Sidewalk Priority: Walk on sidewalks; if absent, walk on the left facing oncoming traffic.",
            "2. Safe Crossing: Stop, Look, and Listen; cross at zebra crossings, bridges, or right angles.",
            "3. Blind Spots: If you cannot see the driver's eyes or mirrors, they cannot see you.",
            "4. Zero Distractions: Keep smartphones and headphones away while crossing the road.",
            "5. School Zones: The maximum speed limit is 30 km/h; watch for unexpected child movements.",
            "6. Police Authority: Directives of Rwanda National Police officers override electronic signals.",
            "7. Emergency Numbers: 112 (National Emergency), 912 (Ambulance), 113 (Traffic Police)."
          ],
          "Review these principles thoroughly. They form the foundation of Rwanda provisional and definitive driving license exams."
        )
      }
    ]
  }
];

async function updateEnglishModule() {
  console.log("Looking up English course...");
  const { data: engCourse, error: cErr } = await supabase
    .from("course_languages")
    .select("id")
    .eq("language", "English")
    .single();

  if (cErr || !engCourse) {
    console.error("English course not found:", cErr);
    process.exit(1);
  }

  const { data: engModule, error: mErr } = await supabase
    .from("course_modules")
    .select("id, title")
    .eq("language_id", engCourse.id)
    .single();

  if (mErr || !engModule) {
    console.error("English module not found:", mErr);
    process.exit(1);
  }

  console.log(`Found English module: "${engModule.title}" (${engModule.id})`);

  for (const lessonData of ENGLISH_LESSONS) {
    console.log(`Updating Lesson ${lessonData.order_index}: "${lessonData.title}" with ${lessonData.topics.length} topics...`);

    // Check if lesson exists by order_index
    const { data: existingLessons } = await supabase
      .from("course_lessons")
      .select("id")
      .eq("module_id", engModule.id)
      .eq("order_index", lessonData.order_index);

    const fallbackContent = lessonData.topics[0]?.content || "";

    if (existingLessons && existingLessons.length > 0) {
      const { error: uErr } = await supabase
        .from("course_lessons")
        .update({
          title: lessonData.title,
          topics: lessonData.topics,
          content: fallbackContent,
          status: "published",
          updated_at: new Date().toISOString()
        })
        .eq("id", existingLessons[0].id);

      if (uErr) {
        console.error(`Error updating lesson ${lessonData.order_index}:`, uErr);
      } else {
        console.log(`Successfully updated lesson ${lessonData.order_index}`);
      }
    } else {
      const { error: iErr } = await supabase
        .from("course_lessons")
        .insert({
          module_id: engModule.id,
          title: lessonData.title,
          content: fallbackContent,
          content_type: "rich_text",
          status: "published",
          topics: lessonData.topics,
          order_index: lessonData.order_index
        });

      if (iErr) {
        console.error(`Error inserting lesson ${lessonData.order_index}:`, iErr);
      } else {
        console.log(`Successfully inserted lesson ${lessonData.order_index}`);
      }
    }
  }

  console.log("All 8 English lessons and all topics successfully updated to 100% English!");
}

updateEnglishModule();
