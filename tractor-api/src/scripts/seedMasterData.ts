/**
 * Seed script — Cooper Corp Service Team & Dealer Master Data (E-FSR June 2026)
 *
 * Idempotent: uses upsert so it is safe to re-run at any time.
 * All imported users get passwordChangedAt = epoch 0, which forces a password
 * reset on their very first login.
 *
 * Usage:
 *   npx ts-node tractor-api/src/scripts/seedMasterData.ts
 *
 * Role mapping from PDF:
 *   RSM                           → role: 'rsm'         (1 per zone)
 *   Service Engineer / Sr. SE     → role: 'area_manager' (CC employees, cover a dealer territory)
 *   Dealer                        → role: 'dealer'       (with vendorCode + dealerType)
 *   Dealer technicians            → role: 'engineer'     (created in-app by dealer, not seeded here)
 */

import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { Region }  from '../models/Region'
import { Area }    from '../models/Area'
import { User }    from '../models/User'

const TEMP_PASSWORD   = 'Cooper@2026'
const FORCE_RESET_AT  = new Date(0)   // epoch 0 → forces password reset on first login

// ─── Regions (Zones) ─────────────────────────────────────────────────────────

// Zone names must match the Region.name values already in the DB exactly (case-sensitive)
const ZONES = ['East', 'North', 'West', 'South'] as const
type Zone = typeof ZONES[number]

// ─── RSMs ─────────────────────────────────────────────────────────────────────

interface RsmSeed {
  name:        string
  employeeId:  string
  email:       string
  mobile:      string
  zone:        Zone
}

const RSM_DATA: RsmSeed[] = [
  { zone: 'East',  name: 'Bikash Bose',         employeeId: '12142', email: 'bikash.bose@coopercorp.in',         mobile: '9831089544' },
  { zone: 'North', name: 'Amit Sharma',          employeeId: '12346', email: 'amit.sharma@coopercorp.in',          mobile: '9953919640' },
  { zone: 'West',  name: 'Sudharm Chobharkar',   employeeId: '12324', email: 'sudharm.chobharkar@coopercorp.in',   mobile: '9167355791' },
  { zone: 'South', name: 'Suresh Chakali',       employeeId: '12095', email: 'suresh.chakali@coopercorp.in',       mobile: '9398668716' },
]

// ─── Service Engineers (area_manager role) ────────────────────────────────────
//
// Each engineer covers a territory (areaName) within a zone.
// Dealers in their territory share the same areaName.
// Fill mobile numbers from the PDF contact column.

interface EngineerSeed {
  name:        string
  employeeId:  string
  email:       string
  mobile:      string
  designation: string   // "Service Engineer" | "Sr. Service Engineer" | "Executive Service"
  zone:        Zone
  areaName:    string   // territory name — one Area document per engineer
}

const ENGINEER_DATA: EngineerSeed[] = [
  // ── EAST ZONE (RSM: Bikash Bose) ─────────────────────────────────────────
  { zone: 'East', name: 'Diganta Medhi',       employeeId: '11680', email: 'diganta.medhi@coopercorp.in',       mobile: '8403815561', designation: 'Service Engineer',     areaName: 'East - Guwahati' },
  { zone: 'East', name: 'Barun Kumar Sardar',  employeeId: '11438', email: 'barunkumar.sardar@coopercorp.in',   mobile: '8585032915', designation: 'Executive Service',     areaName: 'East - Kolkata' },
  { zone: 'East', name: 'Alok Kumar Patel',    employeeId: '11432', email: 'alokkumar.patel@coopercorp.in',     mobile: '9386498354', designation: 'Service Engineer',     areaName: 'East - Ranchi' },
  { zone: 'East', name: 'Sunil Kumar Sinha',   employeeId: '11771', email: 'sunil.sinha@coopercorp.in',         mobile: '9470229728', designation: 'Service Engineer',     areaName: 'East - Patna' },
  { zone: 'East', name: 'Jayant Tarai',        employeeId: '11526', email: 'jayant.tarai@coopercorp.in',        mobile: '9439272036', designation: 'Sr. Service Engineer', areaName: 'East - Bhubaneswar' },

  // ── NORTH ZONE (RSM: Amit Sharma) ────────────────────────────────────────
  { zone: 'North', name: 'Vijay Kumar',        employeeId: '12183', email: 'vijay.kumar@coopercorp.in',         mobile: '8210065986', designation: 'Sr. Service Engineer', areaName: 'North - Varanasi' },
  { zone: 'North', name: 'Pankaj Parihar',     employeeId: '11441', email: 'pankaj.parihar@coopercorp.in',      mobile: '8750865586', designation: 'Service Engineer',     areaName: 'North - Delhi' },
  { zone: 'North', name: 'Ramesh Gurjar',      employeeId: '12207', email: 'ramesh.gurjar@coopercorp.in',       mobile: '9887811321', designation: 'Sr. Service Engineer', areaName: 'North - Jaipur' },
  { zone: 'North', name: 'Saurabh Sharma',     employeeId: '12538', email: 'saurabh.sharma@coopercorp.in',      mobile: '9413709325', designation: 'Service Engineer',     areaName: 'North - Jodhpur' },
  { zone: 'North', name: 'Manpreet Singh',     employeeId: '12422', email: 'manpreet.singh@coopercorp.in',      mobile: '9592224767', designation: 'Service Engineer',     areaName: 'North - Ludhiana' },
  { zone: 'North', name: 'Paramjit Singh',     employeeId: '12254', email: 'paramjit.singh@coopercorp.in',      mobile: '7707876777', designation: 'Service Engineer',     areaName: 'North - Chandigarh' },
  { zone: 'North', name: 'Ankur Katiyar',      employeeId: '12261', email: 'ankur.katiyar@coopercorp.in',       mobile: '6306480197', designation: 'Service Engineer',     areaName: 'North - Meerut' },
  { zone: 'North', name: 'Kranti Mukul',       employeeId: '12280', email: 'kranti.mukul@coopercorp.in',        mobile: '8178584954', designation: 'Service Engineer',     areaName: 'North - Lucknow' },

  // ── WEST ZONE (RSM: Sudharm Chobharkar) ──────────────────────────────────
  { zone: 'West', name: 'Vijay Mohite',        employeeId: '11047', email: 'vijay.mohite@coopercorp.in',        mobile: '9175771013', designation: 'Executive Service',     areaName: 'West - Satara' },
  { zone: 'West', name: 'Hamid Patel',         employeeId: '11053', email: 'hamid.patel@coopercorp.in',         mobile: '9923855286', designation: 'Executive Service',     areaName: 'West - Kolhapur' },
  { zone: 'West', name: 'Prakash V Rangari',   employeeId: '10942', email: 'prakash.rangari@coopercorp.in',     mobile: '9689908427', designation: 'Sr. Service Engineer', areaName: 'West - Pune' },
  { zone: 'West', name: 'Pankaj Mane',         employeeId: '11776', email: 'pankaj.mane@coopercorp.in',         mobile: '9922683399', designation: 'Service Engineer',     areaName: 'West - Nashik' },
  { zone: 'West', name: 'Anil Patil',          employeeId: '11331', email: 'anil.patil@coopercorp.in',          mobile: '7385795715', designation: 'Executive Service',     areaName: 'West - Ahmedabad' },
  { zone: 'West', name: 'Rohitha P',           employeeId: '11356', email: 'rohitha.p@coopercorp.in',           mobile: '8943820713', designation: 'Service Engineer',     areaName: 'West - Hubli' },
  { zone: 'West', name: 'Nitin Barsagade',     employeeId: '11613', email: 'nitin.barsagade@coopercorp.in',     mobile: '9975723164', designation: 'Service Engineer',     areaName: 'West - Nagpur' },
  { zone: 'West', name: 'Vijay Rewapati',      employeeId: '11185', email: 'vijay.rewapati@coopercorp.in',      mobile: '8806015585', designation: 'Service Engineer',     areaName: 'West - Indore' },

  // ── SOUTH ZONE (RSM: Suresh Chakali) ─────────────────────────────────────
  { zone: 'South', name: 'Phani Krishna',      employeeId: '12347', email: 'phani.krishna@coopercorp.in',       mobile: '8886155663', designation: 'Service Engineer',     areaName: 'South - Vijayawada' },
  { zone: 'South', name: 'Jayakumar P',        employeeId: '11322', email: 'jayakumar.p@coopercorp.in',         mobile: '9902945862', designation: 'Executive Service',     areaName: 'South - Bangalore' },
  { zone: 'South', name: 'Melwin Mathew',      employeeId: '11951', email: 'melwin.mathew@coopercorp.in',       mobile: '8050548869', designation: 'Service Engineer',     areaName: 'South - Kochi' },
  { zone: 'South', name: 'Nagrajan M',         employeeId: '11063', email: 'naga.rajan@coopercorp.in',          mobile: '9962875060', designation: 'Sr. Service Engineer', areaName: 'South - Chennai' },
  { zone: 'South', name: 'Jai Sankar',         employeeId: '11886', email: 'jaisankar.c@coopercorp.in',         mobile: '9944273399', designation: 'Service Engineer',     areaName: 'South - Coimbatore' },
  { zone: 'South', name: 'Muthuvel R',         employeeId: '11422', email: 'muthuvel.r@coopercorp.in',          mobile: '9677666616', designation: 'Service Engineer',     areaName: 'South - Madurai' },
  { zone: 'South', name: 'Jeevankumar Chippa', employeeId: '12180', email: 'jeevankumar.chippa@coopercorp.in',  mobile: '7305835630', designation: 'Sr. Service Engineer', areaName: 'South - Hyderabad' },
]

// ─── Dealers ─────────────────────────────────────────────────────────────────
//
// Each dealer is linked to an engineer's areaName (matching the EngineerSeed above).
// Fill from the dealer pages in the PDF.

interface DealerSeed {
  dealerName:  string
  vendorCode:  string
  dealerType:  string   // "Service" | "Sales & Service" | "OEM"
  email:       string
  mobile:      string
  contactName: string   // primary contact person
  state:       string
  city:        string
  zone:        Zone
  areaName:    string   // must match an EngineerSeed.areaName above
}

const DEALER_DATA: DealerSeed[] = [

  // ── EAST – Guwahati (Diganta Medhi) ──────────────────────────────────────
  { zone: 'East', areaName: 'East - Guwahati', dealerName: 'Perfect Engineers',              vendorCode: '22531', dealerType: 'Service',        email: 'perfectengineer.ghy@gmail.com',              mobile: '9435191696', contactName: 'Mr. Hemanta Deori',          state: 'ASSAM',              city: 'Guwahati'   },
  { zone: 'East', areaName: 'East - Guwahati', dealerName: 'Nath & Nath Traders',            vendorCode: '22493', dealerType: 'Service',        email: 'nathandnath2018@gmail.com',                  mobile: '7002825442', contactName: 'Mr. Pinak Pani Nath',        state: 'ASSAM',              city: 'Silchar'    },
  { zone: 'East', areaName: 'East - Guwahati', dealerName: 'CAPITAL TECHNO',                 vendorCode: '22928', dealerType: 'Service',        email: 'capitaltechno.ccpl@gmail.com',               mobile: '9435290345', contactName: 'Trinath Kalita',             state: 'ASSAM',              city: 'Hojai'      },

  // ── EAST – Kolkata (Barun Kumar Sardar) ──────────────────────────────────
  { zone: 'East', areaName: 'East - Kolkata',  dealerName: 'C & B Power Gen Pvt. Ltd.',      vendorCode: '20638', dealerType: 'Service',        email: 'bamdev@cbpowergen.com',                      mobile: '9830212111', contactName: 'Mr. Bamdev Chatterjee',      state: 'WEST BENGAL',        city: 'Kolkata'    },
  { zone: 'East', areaName: 'East - Kolkata',  dealerName: 'Alternative Power Solutions',    vendorCode: '22297', dealerType: 'Service',        email: 'aps@alternativepower.in',                    mobile: '8100099932', contactName: 'Mr. Ashok Das',              state: 'WEST BENGAL',        city: 'Kolkata'    },

  // ── EAST – Ranchi (Alok Kumar Patel) ─────────────────────────────────────
  { zone: 'East', areaName: 'East - Ranchi',   dealerName: 'SRI BHUVAN ELECTRIC ENTERPRISES',vendorCode: '50298', dealerType: 'Service',        email: 'sbeeranchi@gmail.com',                       mobile: '9431105412', contactName: 'Mr. GP Barnwal',             state: 'JHARKHAND',          city: 'Ranchi'     },
  { zone: 'East', areaName: 'East - Ranchi',   dealerName: 'BHARAT DIESELS',                 vendorCode: '22356', dealerType: 'Sales & Service',email: 'bharatdiesel.e@gmail.com',                   mobile: '8709710552', contactName: 'Mr. Dhananjay Kumar Tripathi',state: 'JHARKHAND',         city: 'Ranchi'     },
  { zone: 'East', areaName: 'East - Ranchi',   dealerName: 'Aasaan Provision Pvt. Ltd.',     vendorCode: '23040', dealerType: 'Sales & Service',email: 'service@aasaanprovisions.com',               mobile: '7488966303', contactName: 'Mr. Manish',                 state: 'JHARKHAND',          city: 'Ranchi'     },

  // ── EAST – Patna (Sunil Kumar Sinha) ─────────────────────────────────────
  { zone: 'East', areaName: 'East - Patna',    dealerName: 'MAA ENTERPRISES',                vendorCode: '22506', dealerType: 'Service',        email: 'maaenterprises.sasaram@gmail.com',            mobile: '9955708540', contactName: 'Mr. Abhishek Sinha',         state: 'BIHAR',              city: 'Sasaram'    },
  { zone: 'East', areaName: 'East - Patna',    dealerName: 'VINAYAK GANSET SERVICES',        vendorCode: '22709', dealerType: 'Sales & Service',email: 'vinayakgensetservice@gmail.com',              mobile: '9613902279', contactName: 'Mr. Binod Yadav',            state: 'BIHAR',              city: 'Darbhanga'  },
  { zone: 'East', areaName: 'East - Patna',    dealerName: 'ENGICO',                         vendorCode: '21729', dealerType: 'Service',        email: 'engicopatna@gmail.com',                      mobile: '9835012292', contactName: 'Mr. Ravindra Pratap',        state: 'BIHAR',              city: 'Patna'      },
  { zone: 'East', areaName: 'East - Patna',    dealerName: 'POWER PULSE SOLUTIONS',          vendorCode: '23113', dealerType: 'Service',        email: 'patna.pulse.solutions@gmail.com',             mobile: '8210596889', contactName: 'Jitendra Kumar Singh',       state: 'BIHAR',              city: 'Patna'      },

  // ── EAST – Bhubaneswar (Jayant Tarai) ────────────────────────────────────
  { zone: 'East', areaName: 'East - Bhubaneswar', dealerName: 'VOLANTIS ENGINEERING PVT. LTD.', vendorCode: '21214', dealerType: 'Service',    email: 'volantis.engg@yahoo.in',                     mobile: '9776198103', contactName: 'Mr. Chinmay Das',            state: 'ODISHA',             city: 'Bhubaneswar'},
  { zone: 'East', areaName: 'East - Bhubaneswar', dealerName: 'KK Engineering',               vendorCode: '22416', dealerType: 'Service',      email: 'odishakkengineering@gmail.com',               mobile: '6371777759', contactName: 'Mr. Purna Chandra',          state: 'ODISHA',             city: 'Cuttack'    },

  // ── NORTH – Varanasi (Vijay Kumar) ───────────────────────────────────────
  { zone: 'North', areaName: 'North - Varanasi',  dealerName: 'SHREE GURU ENGINEERING WORKS', vendorCode: '22370', dealerType: 'Service',      email: 'sgewgkp@gmail.com',                          mobile: '8948455555', contactName: 'Mr. Ram Sharma',             state: 'UTTAR PRADESH',      city: 'Gorakhpur'  },
  { zone: 'North', areaName: 'North - Varanasi',  dealerName: 'POWER CONTROL VARANASI',       vendorCode: '22296', dealerType: 'Service',      email: 'powercontrolsvns@gmail.com',                 mobile: '8840498550', contactName: 'Mr. Rajesh Pal',             state: 'UTTAR PRADESH',      city: 'Varanasi'   },

  // ── NORTH – Delhi (Pankaj Parihar) ───────────────────────────────────────
  { zone: 'North', areaName: 'North - Delhi',     dealerName: 'Khushmanda Enterprises',       vendorCode: '22780', dealerType: 'Service',      email: 'ushmaandaenterprises@gmail.com',              mobile: '9319393888', contactName: 'Mr. T. Shee Niwashan',       state: 'UTTAR PRADESH',      city: 'Agra'       },
  { zone: 'North', areaName: 'North - Delhi',     dealerName: 'GRP ENTERPRISES',              vendorCode: '22433', dealerType: 'Service',      email: 'grpenterprisesvk@gmail.com',                 mobile: '9868726661', contactName: 'Mr. Vinod',                  state: 'DELHI',              city: 'New Delhi'  },
  { zone: 'North', areaName: 'North - Delhi',     dealerName: 'INSTANT GENERATOR SERVICE',    vendorCode: '21836', dealerType: 'Service',      email: 'instantgen@yahoo.co.in',                     mobile: '9810200771', contactName: 'Mr. Dinesh Sachdeva',        state: 'DELHI',              city: 'New Delhi'  },
  { zone: 'North', areaName: 'North - Delhi',     dealerName: 'PA Power Project Engineering', vendorCode: '',      dealerType: 'Service',      email: 'papowerproject.eng@gmail.com',               mobile: '8860415562', contactName: 'Shailesh Sharma',            state: 'UTTAR PRADESH',      city: 'Noida'      },

  // ── NORTH – Jaipur (Ramesh Gurjar) ───────────────────────────────────────
  { zone: 'North', areaName: 'North - Jaipur',    dealerName: 'ANIL GENERATORS',              vendorCode: '21559', dealerType: 'Service',      email: 'anil.genorators922@gmail.com',               mobile: '9829524922', contactName: 'Mr. Nihal Singh',            state: 'RAJASTHAN',          city: 'Jaipur'     },
  { zone: 'North', areaName: 'North - Jaipur',    dealerName: 'Mateshwari Engineering',       vendorCode: '21330', dealerType: 'Service',      email: 'mateshwariengineering0007@gmail.com',         mobile: '9672555593', contactName: 'Mr. Hari Singh',             state: 'RAJASTHAN',          city: 'Jaipur'     },
  { zone: 'North', areaName: 'North - Jaipur',    dealerName: 'HARIOM ELECTRICAL & GENERATOR SERVICE', vendorCode: '22299', dealerType: 'Service', email: 'hariom.electricals.gensets@gmail.com',  mobile: '9694502775', contactName: 'Mr. Hari Om',                state: 'RAJASTHAN',          city: 'Alwar'      },
  { zone: 'North', areaName: 'North - Jaipur',    dealerName: 'R.S. Generators',              vendorCode: '22750', dealerType: 'Service',      email: 'bhimraj1975@gmail.com',                      mobile: '7877076392', contactName: 'Mr. Bhim Raj',               state: 'RAJASTHAN',          city: 'Ajmer'      },
  { zone: 'North', areaName: 'North - Jaipur',    dealerName: 'Amita Enterprises',            vendorCode: '22502', dealerType: 'Service',      email: 'amitaenterprises@ymail.com',                 mobile: '9057344066', contactName: 'Mr. S.N. Bhora',             state: 'RAJASTHAN',          city: 'Udaipur'    },

  // ── NORTH – Jodhpur (Saurabh Sharma) ─────────────────────────────────────
  { zone: 'North', areaName: 'North - Jodhpur',   dealerName: 'BLACK STONE DIESEL',           vendorCode: '22900', dealerType: 'Service',      email: 'sales@blackstonediesel.co.in',               mobile: '9414128666', contactName: 'Mr. Pradeep Bhandari',       state: 'RAJASTHAN',          city: 'Jodhpur'    },

  // ── NORTH – Ludhiana (Manpreet Singh) ────────────────────────────────────
  { zone: 'North', areaName: 'North - Ludhiana',  dealerName: 'DIESEL POWER',                 vendorCode: '22283', dealerType: 'Service',      email: 'dieselpower341@gmail.com',                   mobile: '9646961819', contactName: 'Mr. Raju',                   state: 'PUNJAB',             city: 'Amritsar'   },
  { zone: 'North', areaName: 'North - Ludhiana',  dealerName: 'POWER HF INDIA PVT. LTD.',     vendorCode: '',      dealerType: 'Service',      email: 'ashwanikumar@powerhf.com',                   mobile: '9317899380', contactName: 'Mr. Ashwani Kumar',          state: 'PUNJAB',             city: 'Ludhiana'   },

  // ── NORTH – Chandigarh (Paramjit Singh) ──────────────────────────────────
  { zone: 'North', areaName: 'North - Chandigarh',dealerName: 'Raj Power Systems',            vendorCode: '22015', dealerType: 'Service',      email: 'rajpowersystems10@gmail.com',                mobile: '9068682700', contactName: 'Mr. Ajay Malik',             state: 'HARYANA',            city: 'Sonipat'    },
  { zone: 'North', areaName: 'North - Chandigarh',dealerName: 'Raj Power Systems (Zirakpur)', vendorCode: '22824', dealerType: 'Service',      email: 'rajpowerchd@gmail.com',                      mobile: '9306662700', contactName: 'Mr. Ajay Malik',             state: 'PUNJAB',             city: 'Zirakpur'   },
  { zone: 'North', areaName: 'North - Chandigarh',dealerName: 'Tiger Electricals',            vendorCode: '21969', dealerType: 'Service',      email: 'tigerkamal.singh12@gmail.com',               mobile: '9906085660', contactName: 'Mr. Kamal Singh',            state: 'JAMMU & KASHMIR',    city: 'Jammu'      },

  // ── NORTH – Meerut (Ankur Katiyar) ───────────────────────────────────────
  { zone: 'North', areaName: 'North - Meerut',    dealerName: 'Alliance Power System',        vendorCode: '22780', dealerType: 'Service',      email: 'alliancepower.sp@gmail.com',                 mobile: '7302060744', contactName: 'Mr. Sanjay Kumar',           state: 'UTTAR PRADESH',      city: 'Meerut'     },
  { zone: 'North', areaName: 'North - Meerut',    dealerName: 'POWER SOLUTION ENTERPRISES',   vendorCode: '22985', dealerType: 'Service',      email: 'powersolutionent.2014@gmail.com',             mobile: '9917002666', contactName: 'Mr. Sachin',                 state: 'UTTARAKHAND',        city: 'Dehradun'   },
  { zone: 'North', areaName: 'North - Meerut',    dealerName: 'SAQULAINI ENTERPRISES',        vendorCode: '22744', dealerType: 'Service',      email: 'saqlainienterprises56@gmail.com',             mobile: '9719875622', contactName: 'Mr. Shahid Khan',            state: 'UTTAR PRADESH',      city: 'Bareilly'   },

  // ── NORTH – Lucknow (Kranti Mukul) ───────────────────────────────────────
  { zone: 'North', areaName: 'North - Lucknow',   dealerName: 'SUNITA ENTERPRISES',           vendorCode: '22462', dealerType: 'Service',      email: 'sunitaenterprises30@gmail.com',               mobile: '9140372077', contactName: 'Mr. Abhay Singh',            state: 'UTTAR PRADESH',      city: 'Kanpur'     },
  { zone: 'North', areaName: 'North - Lucknow',   dealerName: 'YASH GEN POWER SOLUTIONS',     vendorCode: '22739', dealerType: 'Service',      email: 'yashgenpowersolutions@gmail.com',             mobile: '8562903769', contactName: 'Mr. Ajit Singh',             state: 'UTTAR PRADESH',      city: 'Lucknow'    },

  // ── WEST – Satara (Vijay Mohite) ─────────────────────────────────────────
  { zone: 'West', areaName: 'West - Satara',      dealerName: 'Guru Generators',              vendorCode: '28884', dealerType: 'Service',      email: 'gurugeneratorssatara@gmail.com',              mobile: '9822546100', contactName: 'Mr. Abhijeet Khirsagar',     state: 'MAHARASHTRA',        city: 'Satara'     },

  // ── WEST – Kolhapur (Hamid Patel) ────────────────────────────────────────
  { zone: 'West', areaName: 'West - Kolhapur',    dealerName: 'SIYA SALES & SPARES',          vendorCode: '29651', dealerType: 'Sales & Service',email: 'siya3s1320@gmail.com',                     mobile: '9763717961', contactName: 'Mr. Vishal Melvanki',        state: 'MAHARASHTRA',        city: 'Kolhapur'   },
  { zone: 'West', areaName: 'West - Kolhapur',    dealerName: 'Shree Engineering Works',      vendorCode: '21804', dealerType: 'Service',      email: 'sewpune4@gmail.com',                         mobile: '9161777331', contactName: 'Mr. Nikhil Vede',            state: 'MAHARASHTRA',        city: 'Kolhapur'   },
  { zone: 'West', areaName: 'West - Kolhapur',    dealerName: 'Roshni Engineers',             vendorCode: '21769', dealerType: 'Service',      email: 'bilengine@gmail.com',                        mobile: '9892126499', contactName: 'Mr. Billimoria',             state: 'MAHARASHTRA',        city: 'Mumbai'     },

  // ── WEST – Pune (Prakash V Rangari) ──────────────────────────────────────
  { zone: 'West', areaName: 'West - Pune',        dealerName: 'Melita Engineering Services',  vendorCode: '21887', dealerType: 'Service',      email: 'melitaengg@gmail.com',                       mobile: '7887384039', contactName: 'Mr. Sangram Nalage',         state: 'MAHARASHTRA',        city: 'Pune'       },
  { zone: 'West', areaName: 'West - Pune',        dealerName: 'A.B. GENSETS PVT. LTD',        vendorCode: '21641', dealerType: 'Service',      email: 'purchase@abgensets.co.in',                   mobile: '9822758561', contactName: 'Mr. Ganesh Anerao',          state: 'MAHARASHTRA',        city: 'Pune'       },
  { zone: 'West', areaName: 'West - Pune',        dealerName: 'KV Industries',                vendorCode: '21495', dealerType: 'Service',      email: 'kvidomestic@gmail.com',                      mobile: '9975187558', contactName: 'Mr. Vikram Ogle',            state: 'MAHARASHTRA',        city: 'Pune'       },
  { zone: 'West', areaName: 'West - Pune',        dealerName: 'AISHWARYA POWER PLUS SALES & SERVICE', vendorCode: '22518', dealerType: 'Sales & Service', email: 'aishwaryaent@gmail.com',       mobile: '9822371391', contactName: 'Sham Mane',                  state: 'MAHARASHTRA',        city: 'Pune'       },

  // ── WEST – Nashik (Pankaj Mane) ──────────────────────────────────────────
  { zone: 'West', areaName: 'West - Nashik',      dealerName: 'Power Solutions',              vendorCode: '22040', dealerType: 'Sales & Service',email: 'powersolution65@gmail.com',               mobile: '9922596699', contactName: 'Mr. Datta Kharat',           state: 'MAHARASHTRA',        city: 'Aurangabad' },
  { zone: 'West', areaName: 'West - Nashik',      dealerName: 'Genset Service Centre',        vendorCode: '22559', dealerType: 'Service',      email: 'amitshukla1975@gmail.com',                   mobile: '9822455989', contactName: 'Amit Shukla',                state: 'MAHARASHTRA',        city: 'Nashik'     },

  // ── WEST – Ahmedabad (Anil Patil) ────────────────────────────────────────
  { zone: 'West', areaName: 'West - Ahmedabad',   dealerName: 'GARVI ENTERPRISE',             vendorCode: '22169', dealerType: 'Service',      email: 'garvi.enterprise2018@gmail.com',              mobile: '9714000880', contactName: 'Mr. Ravi Panchal',           state: 'GUJARAT',            city: 'Ahmedabad'  },
  { zone: 'West', areaName: 'West - Ahmedabad',   dealerName: 'SAMARTH ENTERPRISE',           vendorCode: '21825', dealerType: 'Service',      email: 'samarthenterprise03@gmail.com',               mobile: '9909005718', contactName: 'Mr. Arun Mondhe',            state: 'GUJARAT',            city: 'Baroda'     },
  { zone: 'West', areaName: 'West - Ahmedabad',   dealerName: 'DIVINE POWER SOLUTIONS',       vendorCode: '21286', dealerType: 'Service',      email: 'divinepowersolutions1565@gmail.com',          mobile: '9081424222', contactName: 'Mr. Pintesh Patel',          state: 'GUJARAT',            city: 'Surat'      },
  { zone: 'West', areaName: 'West - Ahmedabad',   dealerName: 'SAHYADRI DIESELS',             vendorCode: '22906', dealerType: 'Service',      email: 'engines.sahyadridiesels@gmail.com',           mobile: '9725045081', contactName: 'Mr. Sanjiv G. Kalbhor',      state: 'DADRA & NAGAR HAVELI',city: 'Silvassa'  },

  // ── WEST – Hubli (Rohitha P) — covers Goa, Rajkot, N.Karnataka ───────────
  { zone: 'West', areaName: 'West - Hubli',       dealerName: 'SUNRISE SALES AND SERVICE',    vendorCode: '20729', dealerType: 'Sales & Service',email: 'sunrisesalesandservice@live.in',           mobile: '9099373878', contactName: 'Mr. Ritesh Bhatt',           state: 'GUJARAT',            city: 'Rajkot'     },
  { zone: 'West', areaName: 'West - Hubli',       dealerName: 'RR ENGINEERS',                 vendorCode: '21516', dealerType: 'Service',      email: 'rrengineersgoa@gmail.com',                   mobile: '9970512626', contactName: 'Mr. Roshan Sequeira',        state: 'GOA',                city: 'Panaji'     },
  { zone: 'West', areaName: 'West - Hubli',       dealerName: 'Kartike Sales & Services',     vendorCode: '21316', dealerType: 'Sales & Service',email: 'kishorkulkarni123@yahoo.com',              mobile: '9686502553', contactName: 'Kishor Kulkarni',            state: 'KARNATAKA',          city: 'Hubli'      },
  { zone: 'West', areaName: 'West - Hubli',       dealerName: 'Mangalore Power Services',     vendorCode: '21371', dealerType: 'Sales & Service',email: 'mlorepowerservice@gmail.com',              mobile: '9845253582', contactName: 'Sachin',                     state: 'KARNATAKA',          city: 'Mangalore'  },
  { zone: 'West', areaName: 'West - Hubli',       dealerName: 'KIRTHI HYDRAULIC SPARES',      vendorCode: '22034', dealerType: 'Service',      email: 'kirthispares@gmail.com',                     mobile: '9620355566', contactName: 'Mr. Sripad',                 state: 'KARNATAKA',          city: 'Gulbarga'   },

  // ── WEST – Nagpur (Nitin Barsagade) ──────────────────────────────────────
  { zone: 'West', areaName: 'West - Nagpur',      dealerName: 'ALFA HIGHTECH ENGINEERING SERVICES', vendorCode: '22355', dealerType: 'Service', email: 'alfahitek@gmail.com',                   mobile: '7646856085', contactName: 'Mr. Kishor Sardar',          state: 'CHHATTISGARH',       city: 'Raipur'     },
  { zone: 'West', areaName: 'West - Nagpur',      dealerName: 'N P ENTERPRISES',              vendorCode: '22878', dealerType: 'Service',      email: 'npenterprises.office@gmail.com',              mobile: '7756044442', contactName: 'Mr. Nitin Thakare',          state: 'MAHARASHTRA',        city: 'Nagpur'     },

  // ── WEST – Indore (Vijay Rewapati) ───────────────────────────────────────
  { zone: 'West', areaName: 'West - Indore',      dealerName: 'Divine Electricals',           vendorCode: '21778', dealerType: 'Service',      email: 'rajesh@divineelectricals.in',                mobile: '9926436965', contactName: 'Mr. Rajesh Vishwakarma',     state: 'MADHYA PRADESH',     city: 'Bhopal'     },
  { zone: 'West', areaName: 'West - Indore',      dealerName: 'Positive Power Solutions',     vendorCode: '22713', dealerType: 'Service',      email: 'pps.indore22@gmail.com',                     mobile: '9981015308', contactName: 'Mr. Rahul Kakade',           state: 'MADHYA PRADESH',     city: 'Indore'     },
  { zone: 'West', areaName: 'West - Indore',      dealerName: 'CUMULATIVE ENGINEERING',       vendorCode: '51285', dealerType: 'Service',      email: 'ravi@cumulative.co.in',                      mobile: '',           contactName: 'Ravikant Ojha',              state: 'MADHYA PRADESH',     city: 'Bhopal'     },

  // ── SOUTH – Vijayawada (Phani Krishna) ───────────────────────────────────
  { zone: 'South', areaName: 'South - Vijayawada',dealerName: 'Sree Power Solutions',         vendorCode: '22178', dealerType: 'Service',      email: 'sreepowersolutions.vja@gmail.com',            mobile: '8498959999', contactName: 'Mr. Shridhar',               state: 'ANDHRA PRADESH',     city: 'Vijayawada' },
  { zone: 'South', areaName: 'South - Vijayawada',dealerName: 'SS GEN Power Solutions',       vendorCode: '22888', dealerType: 'Service',      email: 'ssgenpowersolutions@gmail.com',               mobile: '7729957989', contactName: 'Mr. Satyanarayana',          state: 'ANDHRA PRADESH',     city: 'Tirupati'   },

  // ── SOUTH – Bangalore (Jayakumar P) ──────────────────────────────────────
  { zone: 'South', areaName: 'South - Bangalore', dealerName: 'United Diesels',               vendorCode: '20835', dealerType: 'Sales & Service',email: 'udcpdeal@vsnl.net',                        mobile: '9535369668', contactName: 'Mr. T.R. Rao',               state: 'KARNATAKA',          city: 'Bangalore'  },
  { zone: 'South', areaName: 'South - Bangalore', dealerName: 'Sri Nanjundeshwara Power System',vendorCode: '21080', dealerType: 'Sales & Service',email: 'dhanu_dhanunjaya@yahoo.co.in',           mobile: '9341234592', contactName: 'Dhananjay',                  state: 'KARNATAKA',          city: 'Bangalore'  },
  { zone: 'South', areaName: 'South - Bangalore', dealerName: 'M.P. ENGINEERS',               vendorCode: '21976', dealerType: 'Sales & Service',email: 'mpengineersestd199601@yahoo.com',           mobile: '9844076833', contactName: 'Anandbabu',                  state: 'KARNATAKA',          city: 'Mysore'     },
  { zone: 'South', areaName: 'South - Bangalore', dealerName: 'SLV POWER CORPORATION',        vendorCode: '21287', dealerType: 'OEM',           email: 'slvpowercorporation@yahoo.co.in',            mobile: '9900141347', contactName: 'Mr. V L Nagamurthy',         state: 'KARNATAKA',          city: 'Bangalore'  },
  { zone: 'South', areaName: 'South - Bangalore', dealerName: 'RAY POWER SERVICES',           vendorCode: '29675', dealerType: 'Service',      email: 'raypowerservices@gmail.com',                 mobile: '8553440671', contactName: 'Mr. Akshay Kumar A',         state: 'KARNATAKA',          city: 'Bangalore'  },
  { zone: 'South', areaName: 'South - Bangalore', dealerName: 'ADITHI POWER SOLUTIONS',       vendorCode: '22984', dealerType: 'Service',      email: 'adithipowersolutions@gmail.com',              mobile: '8861300606', contactName: 'Nagaraj Naik',               state: 'KARNATAKA',          city: 'Bangalore'  },
  { zone: 'South', areaName: 'South - Bangalore', dealerName: 'NADAF FORM EQUIPMENTS',        vendorCode: '21872', dealerType: 'Sales & Service',email: 'nadafdiesel@yahoo.com',                    mobile: '8884622786', contactName: 'M. Abdul Rawoof',            state: 'KARNATAKA',          city: 'Bellary'    },

  // ── SOUTH – Kochi (Melwin Mathew) ────────────────────────────────────────
  { zone: 'South', areaName: 'South - Kochi',     dealerName: 'Nucomet Enterprises',          vendorCode: '22252', dealerType: 'Service',      email: 'sunil@nucomet.com',                          mobile: '9349195971', contactName: 'Sunil Kumar S',              state: 'KERALA',             city: 'Kochi'      },
  { zone: 'South', areaName: 'South - Kochi',     dealerName: 'Unitech Equipments',           vendorCode: '21318', dealerType: 'Sales & Service',email: 'unitech.ess@gmail.com',                    mobile: '9447352261', contactName: 'Mr. Binish',                 state: 'KERALA',             city: 'Palakkad'   },
  { zone: 'South', areaName: 'South - Kochi',     dealerName: 'POWERIZE HYBRID ENGINEERING LLP',vendorCode: '22257', dealerType: 'Sales & Service',email: 'info@powerize.in',                     mobile: '9349127133', contactName: 'Mr. Jamshad',                state: 'KERALA',             city: 'Malappuram' },
  { zone: 'South', areaName: 'South - Kochi',     dealerName: 'TORQUE GENERATOR SERVICE',     vendorCode: '22733', dealerType: 'Service',      email: 'torqueinnovationsgroup@gmail.com',            mobile: '8606655111', contactName: 'Mr. Midhun',                 state: 'KERALA',             city: 'Cherthala'  },
  { zone: 'South', areaName: 'South - Kochi',     dealerName: 'NOOTHAN TRADING AND MARKETING',vendorCode: '22773', dealerType: 'Sales & Service',email: 'noothancoopergenss@gmail.com',             mobile: '8078290039', contactName: 'Mr. Srihari',                state: 'KERALA',             city: 'Thrissur'   },

  // ── SOUTH – Chennai (Nagrajan M) ─────────────────────────────────────────
  { zone: 'South', areaName: 'South - Chennai',   dealerName: 'ADS HI POWER SERVICE',         vendorCode: '11811', dealerType: 'Sales & Service',email: 'admin@adshipower.com',                     mobile: '',           contactName: 'ADS Hi Power',               state: 'TAMIL NADU',         city: 'Chennai'    },
  { zone: 'South', areaName: 'South - Chennai',   dealerName: 'VULTURE POWER TAMILNADU',      vendorCode: '21963', dealerType: 'Sales & Service',email: 'vulturepowerengineeringservice@gmail.com', mobile: '8124506777', contactName: 'Mr. Singarvel',              state: 'TAMIL NADU',         city: 'Chennai'    },
  { zone: 'South', areaName: 'South - Chennai',   dealerName: 'Chennai Diesels Pvt Ltd',      vendorCode: '21510', dealerType: 'Sales & Service',email: 'chennaidiesel@gmail.com',                  mobile: '9841862628', contactName: 'Mr. Sivakumar',              state: 'TAMIL NADU',         city: 'Chennai'    },

  // ── SOUTH – Coimbatore (Jai Sankar) ──────────────────────────────────────
  { zone: 'South', areaName: 'South - Coimbatore',dealerName: 'IDEAL POWER SYSTEMS',          vendorCode: '21728', dealerType: 'Sales & Service',email: 'idealpowersystems08@gmail.com',            mobile: '9543512347', contactName: 'Mr. Bharati',                state: 'TAMIL NADU',         city: 'Coimbatore' },
  { zone: 'South', areaName: 'South - Coimbatore',dealerName: 'MASTER ASSOCIATES',            vendorCode: '22479', dealerType: 'Sales & Service',email: 'cooper@masterassociates.co.in',            mobile: '9787735930', contactName: 'Mr. Jagan',                  state: 'TAMIL NADU',         city: 'Pondicherry' },
  { zone: 'South', areaName: 'South - Coimbatore',dealerName: 'AS DAIMOND DIESELS',           vendorCode: '22592', dealerType: 'Service',      email: 'asdiamonddiesel@gmail.com',                  mobile: '9025000175', contactName: 'Mr. Hari Babu',              state: 'TAMIL NADU',         city: 'Karur'      },

  // ── SOUTH – Madurai (Muthuvel R) ─────────────────────────────────────────
  { zone: 'South', areaName: 'South - Madurai',   dealerName: 'RESOL POWER SOLUTIONS',        vendorCode: '22572', dealerType: 'Service',      email: 'resolpowersolution@gmail.com',               mobile: '7339313017', contactName: 'Mr. Athithan',               state: 'TAMIL NADU',         city: 'Tirunelveli'},

  // ── SOUTH – Hyderabad (Jeevankumar Chippa) ───────────────────────────────
  { zone: 'South', areaName: 'South - Hyderabad', dealerName: 'HNS Service Centre',           vendorCode: '22508', dealerType: 'Service',      email: 'hnsservices7861@gmail.com',                  mobile: '9989837532', contactName: 'Mr. Nazeeruddin',            state: 'TELANGANA',          city: 'Hyderabad'  },
  // Note: SHIVA POWERS shares hnsservices7861@gmail.com — using vendor-code based login so both records exist
  { zone: 'South', areaName: 'South - Hyderabad', dealerName: 'SHIVA POWERS',                 vendorCode: '22478', dealerType: 'Sales & Service',email: 'dealer22478@coopercorp.in',               mobile: '9959041115', contactName: 'Mr. Prabhakar',              state: 'TELANGANA',          city: 'Warangal'   },
  { zone: 'South', areaName: 'South - Hyderabad', dealerName: 'SRI SAI GENSET SERVICES',      vendorCode: '',      dealerType: 'Service',      email: 'srisaigensetservices78@gmail.com',            mobile: '9030046510', contactName: 'Mr. Rajeshwar Reddy',        state: 'TELANGANA',          city: 'Hyderabad'  },
]

// ─── Seed Runner ─────────────────────────────────────────────────────────────

async function run() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || ''
  if (!MONGO_URI) throw new Error('MONGODB_URI env var is not set')

  await mongoose.connect(MONGO_URI)
  console.log('Connected to MongoDB')

  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10)

  // Step 1 — Upsert zone Regions
  const regionMap = new Map<Zone, mongoose.Types.ObjectId>()
  for (const zone of ZONES) {
    const region = await Region.findOneAndUpdate(
      { name: zone },
      { $setOnInsert: { name: zone, states: [] } },
      { upsert: true, returnDocument: 'after' }
    )
    regionMap.set(zone, region._id as mongoose.Types.ObjectId)
    console.log(`  Region: ${zone} (${region._id})`)
  }

  // Step 2 — Upsert RSM users and link to Regions
  for (const rsm of RSM_DATA) {
    const regionId = regionMap.get(rsm.zone)!
    const user = await User.findOneAndUpdate(
      { username: rsm.email.toLowerCase() },
      {
        $set: {
          name: rsm.name, role: 'rsm',
          employeeId: rsm.employeeId,
          designation: 'RSM',
          email: rsm.email.toLowerCase(),
          mobile: rsm.mobile || undefined,
          regionId,
          status: 'active',
        },
        $setOnInsert: {
          username:          rsm.email.toLowerCase(),
          passwordHash,
          passwordChangedAt: FORCE_RESET_AT,
        },
      },
      { upsert: true, returnDocument: 'after' }
    )
    await Region.findByIdAndUpdate(regionId, { managerId: user._id })
    console.log(`  RSM: ${rsm.name} (${rsm.zone})`)
  }

  // Step 3 — Upsert Areas + area_manager users
  const areaMap = new Map<string, mongoose.Types.ObjectId>()   // areaName → Area _id

  for (const eng of ENGINEER_DATA) {
    const regionId = regionMap.get(eng.zone)!

    // Upsert Area document
    const area = await Area.findOneAndUpdate(
      { name: eng.areaName, regionId },
      { $setOnInsert: { name: eng.areaName, regionId } },
      { upsert: true, returnDocument: 'after' }
    )
    areaMap.set(eng.areaName, area._id as mongoose.Types.ObjectId)

    // Upsert area_manager user
    const user = await User.findOneAndUpdate(
      { username: eng.email.toLowerCase() },
      {
        $set: {
          name: eng.name, role: 'area_manager',
          employeeId:  eng.employeeId,
          designation: eng.designation,
          email:       eng.email.toLowerCase(),
          mobile:      eng.mobile || undefined,
          areaId:      area._id,
          status:      'active',
        },
        $setOnInsert: {
          username:          eng.email.toLowerCase(),
          passwordHash,
          passwordChangedAt: FORCE_RESET_AT,
        },
      },
      { upsert: true, returnDocument: 'after' }
    )
    await Area.findByIdAndUpdate(area._id, { managerId: user._id })
    console.log(`  Engineer: ${eng.name} → ${eng.areaName}`)
  }

  // Step 4 — Upsert dealer users
  for (const dealer of DEALER_DATA) {
    const areaId = areaMap.get(dealer.areaName)
    if (!areaId) {
      console.warn(`  WARN: no Area found for areaName="${dealer.areaName}" — skipping ${dealer.dealerName}`)
      continue
    }

    await User.findOneAndUpdate(
      { username: dealer.email.toLowerCase() },
      {
        $set: {
          name:        dealer.contactName,
          role:        'dealer',
          dealerName:  dealer.dealerName,
          vendorCode:  dealer.vendorCode,
          dealerType:  dealer.dealerType,
          email:       dealer.email.toLowerCase(),
          mobile:      dealer.mobile || undefined,
          address:     { state: dealer.state, city: dealer.city },
          areaId,
          status:      'active',
        },
        $setOnInsert: {
          username:          dealer.email.toLowerCase(),
          passwordHash,
          passwordChangedAt: FORCE_RESET_AT,
          pincodes:          [],
        },
      },
      { upsert: true, returnDocument: 'after' }
    )
    console.log(`  Dealer: ${dealer.dealerName} (${dealer.vendorCode}) → ${dealer.areaName}`)
  }

  console.log('\nDone.')
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
