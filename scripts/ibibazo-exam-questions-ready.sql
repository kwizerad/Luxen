-- Bulk insert for standalone exam_questions
-- Generated from scripts/parsed-questions.json
-- Uses category: bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e

BEGIN;

INSERT INTO exam_settings (category_id, question_count, duration_minutes, sorting_mode, updated_by)
VALUES ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$, 20, 20, 'RANDOM', NULL)
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO exam_questions (category_id,question,question_image,option_a,option_a_image,option_b,option_b_image,option_c,option_c_image,option_d,option_d_image,correct_answer,explanation,created_by) VALUES

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ikinyabiziga cyose cyangwa ibinyabiziga bigenda bigomba kugira:$q$,NULL,$q$Umuyobozi$q$,NULL,$q$Umuherekeza$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ijambo “akayira” bivuga inzira nyabagendwa ifunganye yagenewe gusa:$q$,NULL,$q$Abanyamaguru$q$,NULL,$q$Ibinyabiziga bigendera ku biziga bibiri$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umurongo uciyemo uduce umenyesha ahegereye umurongo ushobora kuzuzwa n’uturanga gukata tw’ibara ryera utwo turanga cyerekezo tumenyesha :$q$,NULL,$q$Igisate cy’umuhanda abayobozi bagomba gukurikira$q$,NULL,$q$Ahegereye umurongo ukomeje$q$,NULL,$q$Igabanurwa ry’umubare w’ibisate by’umuhanda mu cyerekezo bajyamo$q$,NULL,$q$A na C nibyo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ahantu ho kugendera mu muhanda herekanwa n’ibimenyetso bimurika ibinyabiziga ntibishobora kuhagenda :$q$,NULL,$q$Biteganye$q$,NULL,$q$Ku murongo umwe$q$,NULL,$q$A na B nibyo$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$igazetti ivuga ko ahantu ho kugenda mu muhanda herekanwa n’ibimenyetso bimurika, ibinyabiziga bishobora kuhagenda biteganye naho umubare wabyo utatuma biba ngombwa$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bikurikira bigomba gukorerwa isuzumwa buri mwaka:$q$,NULL,$q$Ibinyabiziga bigenewe gutwara abagenzi muri rusange$q$,NULL,$q$Ibinyabiziga bigenewe gutwara ibintu birengeje toni 3.5$q$,NULL,$q$Ibinyabiziga bigenewe kwigisha gutwara$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$nuko ibyavuzwe haruguru bisuzumwa buri mezi 6$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ubugari bwa romoruki ikuruwe n’ikinyamitende itatu ntibugomba kurenza ibipimo bikurikira:$q$,NULL,$q$cm75$q$,NULL,$q$cm125$q$,NULL,$q$cm265$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$D$q$,$q$cm30$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uburebure bw’ibinyabiziga bikurikira ntibugomba kurenga metero 11 :$q$,NULL,$q$Ibifite umutambiko umwe uhuza imipira$q$,NULL,$q$Ibifite imitambiko ibiri gusa$q$,NULL,$q$Makuzungu$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$D$q$,$q$imitambiko ibiri cyangwa se irenga$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ikinyabiziga kibujijwe guhagarara akanya kanini aha hakurikira :$q$,NULL,$q$Ahatarengeje metero 1 imbere cyangwa inyuma y’ikinyabiziga gihagaze akanya gato cyangwa kanini :$q$,NULL,$q$Ahantu hari ibimenyetso bibuza byabugenewe$q$,NULL,$q$Aho abanyamaguru banyura mu muhanda ngo bakikire inkomyi$q$,NULL,$q$Ibisubizo byose nibyo$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kunyuranaho bikorerwa:$q$,NULL,$q$Mu ruhande rw’iburyo gusa$q$,NULL,$q$Igihe cyose ni ibumoso$q$,NULL,$q$Iburyo iyo unyura ku nyamaswa$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$bikorerwa ibumoso ; ariko bishobora no gukorerwa iburyo iyo umuyobozi unyurwaho yerekanye ko ashaka kugana ibumoso$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cyerekana umuvuduko ntarengwa ikinyabiziga kitagomba kurenza gishyirwa gusa ku binyabiziga bifite uburemere ntarengwa bukurikira:$q$,NULL,$q$Burenga toni 1$q$,NULL,$q$Burenga toni 2$q$,NULL,$q$Burenga toni 24$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$Toni 5$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ahatari mu nsisiro umuvuduko ntarengwa mu isaha wa velomoteri ni:$q$,NULL,$q$Km50$q$,NULL,$q$Km40$q$,NULL,$q$Km30$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi ugenda mu muhanda igihe ubugari bwawo budatuma anyuranaho nta nkomyi ashobora kunyura mu kayira k’abanyamaguru ariko amaze kureba ibi bikurikira:$q$,NULL,$q$Umuvuduko w’abanyamaguru$q$,NULL,$q$Ubugari bw’umuhanda$q$,NULL,$q$Umubare w’abanyamaguru$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$umuvuduko w’ibinyabiziga$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ku byerekeye kwerekana ibinyabiziga n’ukumurika kwabyo ndetse no kwerekana ihindura ry’ibyerekezo byabyo. Birabujijwe gukora andi matara cyangwa utugarurarumuri uretse ibitegetswe ariko ntibireba amatara akurikira:$q$,NULL,$q$Amatara ndanga$q$,NULL,$q$Amatara ari imbere mu modoka$q$,NULL,$q$Amatara ndangaburambarare$q$,NULL,$q$Ibisubizo byose nibyo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo nta mategeko awugabanya by’umwihariko umuvuduko ntarengwa w’amapikipiki mu isaha ni:$q$,NULL,$q$Km25$q$,NULL,$q$Km70$q$,NULL,$q$Km40$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$km80 mu isaha$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uburyo bukoreshwa kugirango ikinyabiziga kigende gahoro igihe feri idakora neza babwita:$q$,NULL,$q$Feri y’urugendo$q$,NULL,$q$Feri yo guhagarara umwanya munini$q$,NULL,$q$Feri yo gutabara$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Nibura ikinyabiziga gitegetswe kugira uduhanagurakirahure tungahe:$q$,NULL,$q$2$q$,NULL,$q$3$q$,NULL,$q$1$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara maremare y’ikinyabiziga agomba kuzimwa mu bihe bikurikira:$q$,NULL,$q$Iyo umuhanda umurikiye umuyobozi abasha kureba muri metero 20$q$,NULL,$q$Iyo ikinyabiziga kigiye kubisikana n’ibindi$q$,NULL,$q$Iyo ari mu nsisiro$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ikinyabiziga ntigishobora kugira amatara arenga abiri y’ubwoko bumwe keretse kubyerekeye amatara akurikira:$q$,NULL,$q$Itara ndangamubyimba$q$,NULL,$q$Itara ryerekana icyerekezo$q$,NULL,$q$Itara ndangaburumbarare$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ubugari bwa romoruki ikuruwe n’igare cyangwa velomoteri ntiburenza ibipimo bikurikira:$q$,NULL,$q$cm25$q$,NULL,$q$cm125$q$,NULL,$q$cm45$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$cm 75$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bikoreshwa nka tagisi, bitegerereza abantu mu nzira nyabagendwa, bishobora gushyirwaho itara ryerekana ko ikinyabiziga kitakodeshejwe. Iryo tara rishyirwaho ku buryo bukurikira:$q$,NULL,$q$Ni itara ry’icyatsi rishyirwa imbere ku kinyabiziga$q$,NULL,$q$Ni itara ry’icyatsi rishyirwa ibumoso$q$,NULL,$q$Ni itara ry’umuhondo rishyirwa inyuma$q$,NULL,$q$A na C ni ibisubizo by’ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Za otobisi zagenewe gutwara abanyeshuri zishobora gushyirwaho amatara abiri asa n’icunga rihishije amyasa kugirango yerekane ko zihagaze no kwerekana ko bagomba kwitonda, ayo matara ashyirwaho ku buryo bukurikira :$q$,NULL,$q$Amatara abiri ashyirwa inyuma$q$,NULL,$q$Amatara abiri ashyirwa imbere$q$,NULL,$q$Rimwe rishyirwa imbere irindi inyuma$q$,NULL,$q$b na c ni ibisubizo by’ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Itara ryo guhagarara ry’ibara ritukura rigomba kugaragara igihe ijuru rikeye nibura mu ntera ikurikira:$q$,NULL,$q$Metero 100 ku manywa na metero 20 mu ijoro$q$,NULL,$q$Metero 150 ku manywa na metero50 mu ijoro$q$,NULL,$q$Metero 200 ku manywa na metero100 mu ijoro$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$Metero 20 Kumanywa; Metero 150 nijoro$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo umuvuduko w’ibinyabiziga bidapakiye ushobora kurenga km50 mu isaha ahategamye, bigomba kuba bifite ibikoresho by’ihoni byumvikanira mu ntera:$q$,NULL,$q$Metero 100$q$,NULL,$q$Metero 200$q$,NULL,$q$Metero 50$q$,NULL,$q$Metero 150$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Birabujijwe kugenza ibinyabiziga bigendeshwa na moteri naza romoruki zikururwa nabyo, iyo ibiziga byambaye inziga zidahagwa cyangwa inziga zikururuka zifite umubyimba uri hasi ya cm 4. Ariko ibyo ntibikurikizwa kubinyabiziga bikurikira:$q$,NULL,$q$Ku binyabiziga by’ingabo bijya ahatarenga km25$q$,NULL,$q$Ibinyabiziga bihinga bijya ahatarenga km 25$q$,NULL,$q$Ibinyabiziga bya police$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igice cy'inzira nyabagendwa kigarukira ku mirongo ibiri yera icagaguye ibangikanye kandi gifite ubugari budahagije kugira ngo imodoka zitambuke neza, kiba ari:$q$,NULL,$q$Ahanyurwa amapikipiki$q$,NULL,$q$Ahanyurwa n’ingorofani$q$,NULL,$q$Ahanyurwa n’ibinyamitende$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ubugari bwa romoruki ntiburenza ubugari bw’ikinyabiziga kiyikurura iyo ikuruwe n’ibinyabiziga bikurikira:$q$,NULL,$q$Igare$q$,NULL,$q$Velomoteri$q$,NULL,$q$Ipikipiki ifite akanyabiziga kometse ku ruhande rwayo$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo harimo indi myanya birabujijwe gutwara ku ntebe y’imbere y’imodoka abana badafite imyaka:$q$,NULL,$q$Imyaka 10$q$,NULL,$q$Imyaka 12$q$,NULL,$q$Imyaka 7$q$,NULL,$q$Ntagisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa kivuga gutambuka mbere y’ibinyabiziga biturutse imbere gifite amabara akurikira:$q$,NULL,$q$Ubuso ni umweru$q$,NULL,$q$Ikirango ni umutuku n’umukara$q$,NULL,$q$Ikirango ni umweru n’umukara$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$ubuso ni ubururu ; ikirango ni umweru n’umutuku$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni ryari itegeko rigenga gutambuka mbere kw’iburyo rikurikizwa mu masangano:$q$,NULL,$q$Iyo nta cyapa cyo gutambuka mbere gihari$q$,NULL,$q$Iyo ikimenyetso kimurika cyagenewe ibinyabiziga kidakora$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibimenyetso bimurika byerekana uburyo bwo kugendera mu muhanda kw'ibinyabiziga bishyirwa iburyo bw'umuhanda. Ariko bishobora no gushyirwa ibumoso cyangwa hejuru y’umuhanda:$q$,NULL,$q$Hakurikijwe icyerekezo abagenzi bireba baganamo$q$,NULL,$q$Hakurikijwe icyo ibyo bimenyetso bigamije kwerekana$q$,NULL,$q$Kugirango birusheho kugaragara neza$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo itara ry’umuhondo rimyatsa rikoreshejwe mu masangano y’amayira ahwanyije agaciro rishyirwa ahagana he:$q$,NULL,$q$Kuri buri nzira$q$,NULL,$q$Hagati y’amasangano$q$,NULL,$q$Iburyo bw’amasangano$q$,NULL,$q$a na b ni ibisubizo by’ ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Inkombe z’inzira nyabagendwa cyangwa z’umuhanda zishobora kugaragazwa n’ibikoresho ngarurarumuri. Ibyo bikoresho bigomba gushyirwaho ku buryo abagenzi babibona :$q$,NULL,$q$Babona gusa ibumoso bwabo iby’ibara ritukura$q$,NULL,$q$Iburyo babona iby’ibara risa n’icunga rihishije gusa$q$,NULL,$q$Babona iby’ibara ry’umuhondo ibumoso$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$Ibumoso babona iby’ibara ryera ; iburyo babona iby’ibara ry’umutuku cyangwa ibisa n’icunga rihishije (Umuhondo)$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bikurikira bigomba gukorerwa isuzumwa rimwe mu mezi 6:$q$,NULL,$q$Ibinyabiziga bitwara abagenzi muri rusange$q$,NULL,$q$Ibinyabiziga bigenewe gutwara ibintu birengeje toni 3.5$q$,NULL,$q$Ibinyabiziga bigenewe kwigisha gutwara$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo kuyobya umuhanda ari ngombwa bigaragazwa kuva aho uhera no kuburebure bwawo n’icyapa gifite ubuso bw’amabara akurikira:$q$,NULL,$q$Ubururu$q$,NULL,$q$Umweru$q$,NULL,$q$Umutuku$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ku mihanda ibyapa bikurikira bigomba kugaragazwa ku buryo bumwe:$q$,NULL,$q$Ibyapa biyobora n’ibitegeka$q$,NULL,$q$Ibyapa biburira n’ibitegeka$q$,NULL,$q$Ibyapa bibuza n’ibitegeka$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni iyihe feri ituma imodoka igenda buhoro kandi igahagarara ku buryo bwizewe bubangutse kandi nyabwo, uko imodoka yaba yikoreye kose yaba igeze ahacuramye cyangwa ahaterera:$q$,NULL,$q$Feri y’urugendo$q$,NULL,$q$Feri yo gutabara$q$,NULL,$q$Feri yo guhagarara umwanya munini$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibizirikisho by’iminyururu cyangwa by’insinga kimwe n’ibindi by’ingoboka bikoreshwa gusa igihe nta kundi umuntu yabigenza kandi nta kindi bigiriwe uretse gusa kugirango ikinyabiziga kigere aho kigomba gukorerwa kandi nturenze na rimwe km 20 mu isaha, ibyo bizirikisho bigaragazwa ku buryo bukurikira:$q$,NULL,$q$Agatambaro gatukura kuri cm 50 z’umuhanda$q$,NULL,$q$Ikimenyetso cy’itara risa n’icunga rihishije$q$,NULL,$q$Icyapa cyera cya mpande enye zingana gifite cm 20 kuri buri ruhande$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$Icyapa cyera cya mpande enye zingana gifite cm 30 kuri buri ruhande$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uretse mu mujyi, ku yindi mihanda yajyenwe na minisitiri ushinzwe gutwara abantu n’ibintu, uburemere ntarengwa ku binyabiziga bifite imitambiko itatu cyangwa irenga hatarimo makuzungu ni :$q$,NULL,$q$Toni 10$q$,NULL,$q$Toni 12$q$,NULL,$q$Toni 16$q$,NULL,$q$Toni 24$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ubugari bw’imizigo yikorewe n’ibinyamitende itatu n’ubwiyikorewe n’ibinyamitende 4 bifite cyangwa bidafite moteri kimwe n’ubw’iyikorewe na romuruki zikuruwe n’ibyo binyabiziga ntibushobora kurenga ibipimo bikurikira:$q$,NULL,$q$cm 30 ku bugari bw’icyo kinyabiziga kidapakiye$q$,NULL,$q$Ubugari ntarengwa budakuka ni metero 2 na sentimetero 50$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kunyura ku binyabiziga bindi, uretse icy’ibiziga bibiri, bibujijwe aha hakurikira:$q$,NULL,$q$Hafi y’iteme iyo hari umuhanda ufunganye$q$,NULL,$q$Hafi y’aho abanyamaguru banyura$q$,NULL,$q$Hafi y’ibice by’umuhanda bimeze nabi$q$,NULL,$q$Ibi bisubizo byose ni ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo nta mategeko awugabanya by’umwihariko, umuvuduko ntarengwa ku modoka zitwara abagenzi mu buryo bwa rusange ni:$q$,NULL,$q$Km 60 mu isaha$q$,NULL,$q$Km 40 mu isaha$q$,NULL,$q$Km 25 mu isaha$q$,NULL,$q$Km20 mu isaha$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo nta mategeko awugabanya by’umwihariko, umuvuduko ntarengwa ku modoka zikoreshwa nk’amavatiri y’ifasi cyangwa amatagisi zifite uburemere bwemewe butarenga kilogarama 3500 ni:$q$,NULL,$q$Km 60 mu isaha$q$,NULL,$q$Km 40 mu isaha$q$,NULL,$q$Km 70 mu isaha$q$,NULL,$q$Km20 mu isaha$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ikinyabiziga kibujijwe guhagarara akanya kanini aha hakurikira :$q$,NULL,$q$Imbere y’ahantu hinjirwa hakasohokerwa n’abantu benshi$q$,NULL,$q$Mu muhanda aho ugabanyijemo ibisate bigaragazwa n’imirongo idacagaguye$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo bwije kugeza bukeye cyangwa bitewe n’uko ibihe bimeze nk’igihe cy’ibihu cyangwa cy’imvura bitagishoboka kubona neza muri m 200, udutsiko twose tw’abanyamaguru nk’imperekerane cyangwa udutsiko tw’abanyeshuri bari ku murongo bayobowe n’umwarimu, iyo bagenda mu muhanda ku isonga hakaba hari abantu barenze umwe bagomba kugaragazwa kuburyo bukurikira :$q$,NULL,$q$Imbere ni itara ry’umuhondo ritwariwe ibumoso$q$,NULL,$q$Inyuma ni itara ryera ritwariwe ibumoso n’umuntu uri ku murongo w’inyuma hafi y’umurongo ugabanya umuhanda mo kabiri$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$Imbere n’itara ryera; inyuma n’itara ritukura$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Utuyira turi ku mpande z’umuhanda n’ inkengero zigiye hejuru biharirwa abanyamaguru mu bihe bikurikira:$q$,NULL,$q$Iyo hari amategeko yihariye yerekanwa n’ibimenyetso$q$,NULL,$q$Iyo badatatanye kandi bayobowe n’umwarimu$q$,NULL,$q$Iyo hatari amategeko yihariye yerekanwa n’ibimenyetso$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Imburira zimurika zemerewe gukoreshwa kugirango bamenyeshe umuyobozi ko bagiye kumunyuraho aha hakurikira:$q$,NULL,$q$Mu nsisiro gusa$q$,NULL,$q$Ahegereye inyamaswa zikurura$q$,NULL,$q$Hafi y’amatungo$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$mu nsissiro n’ahandi hose$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uburemere ntarengwa bwemewe ntibushobora kurenga ½ cy’uburemere bw’ikinyabiziga gikurura nubw’umuyobozi kuri romoruki zikurikira :$q$,NULL,$q$Romoruki ifite feri y’urugendo$q$,NULL,$q$Romoruki idafite feri y’urugendo$q$,NULL,$q$Romoruki itarenza kg 750$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bifite ubugari burengeje ibipimo bikurikira bigomba kugira amatara ndangaburumbarare :$q$,NULL,$q$Metero 2 na cm 10$q$,NULL,$q$Metero 2 na cm 50$q$,NULL,$q$Metero 3$q$,NULL,$q$Metero 2$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Nta tara na rimwe cyangwa akagarurarumuri bishobora kuba bifunze ku buryo igice cyabyo cyo hasi cyane kimurika kitaba kiri hasi y’ibipimo bikurikira kuva ku butaka igihe ikinyabiziga kidapakiye :$q$,NULL,$q$Cm 30$q$,NULL,$q$Cm 40$q$,NULL,$q$Cm 50$q$,NULL,$q$Metero 1 na cm 55$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo ikinyabiziga gifite amatara abiri cyangwa menshi y’ubwoko bumwe ayo matara agomba kugira ibara rimwe n’ingufu zingana kandi akagomba gushyirwaho ku buryo buteganye uhereye ku murongo ugabanya ikinyabizigamo kabiri mu burebure bwacyo. Ariko ibi ntibikurikizwa ku matara akurikira:$q$,NULL,$q$itara ndangamubyimba$q$,NULL,$q$itara ndangaburumbarare$q$,NULL,$q$itara ribonesha icyapa kiranga numero y’ikinyabiziga inyuma$q$,NULL,$q$A na B byose nibyo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ahari hejuru cyane y’ubuso bumurika h’amatara ndangambere na ndanganyuma ntihashobora kuba aharenze ibipimo bikurikira hejuru y’ubutaka iyo ikinyabiziga kidapakiye:$q$,NULL,$q$m1 na cm 50$q$,NULL,$q$m1 na cm 75$q$,NULL,$q$m 1 na cm 90$q$,NULL,$q$m2 na cm 10$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni ryari ikinyabiziga gishobora kugenda mu muhanda moteri itaka cyangwa vitesi idakora:$q$,NULL,$q$igihe kigenda ahamanuka$q$,NULL,$q$igihe gikuruwe n’ikindi kinyabiziga$q$,NULL,$q$igihe gifite feri y’urugendo$q$,NULL,$q$ibisubizo byose ni byo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Buri modoka cyangwa buri romoruki ikuruwe n’iyo modoka bishobora kugira itara risa n’icyatsi kibisi bituma umuyobozi yerekana ko yabonye ikimenyetso cy’uwitegura kumunyuraho. Iryo tara rigomba gushyirwa aha hakurikira:$q$,NULL,$q$hafi y’inguni y’ibumoso bw’ikinyabiziga$q$,NULL,$q$inyuma hafi y’impera y’iburyo bw’ikinyabiziga$q$,NULL,$q$inyuma ahegereye inguni y’iburyo$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$inyuma hafi y’impera y’ibumoso bw’ikinyabiziga$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bikurikira bigomba kugira icyerekana umuvuduko kiri aho umuyobozi areba neza kandi kigahora kitabwaho kugirango kigume gukora neza:$q$,NULL,$q$ibinyabiziga bifite umuvuduko nibura wa km 60 mu isaha$q$,NULL,$q$ibinyabiziga bishobora kurenza km 40 mu isaha$q$,NULL,$q$ibinyabiziga bishobora kurenza km 30 mu isaha$q$,NULL,$q$ibinyabiziga bishobora kurenza km 25 mu isaha$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ubugari bw’imizigo yikorewe n’ipikipiki idafite akanyabiziga ko kuruhande kimwe n’ubwa romoruki ikuruwe na bene icyo kinyabiziga ntibushobora kurenza ibipimo bikurikira:$q$,NULL,$q$m 1.25$q$,NULL,$q$cm 30$q$,NULL,$q$cm 75$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bikurikira bigomba kugira itara ry’ubururu rimyatsa ribonesha mu mpande zose:$q$,NULL,$q$ibinyabiziga bifite ubugari burenga m 2 na cm 10$q$,NULL,$q$ibinyabiziga bya police y’igihugu$q$,NULL,$q$ibinyabiziga ndakumirwa$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bihinga n’ibindi bikoresho byihariye bikoreshwa n’ibigo bipatana imirimo, iyo bigenda mu nzira nyabagendwa igihe cya nijoro cyangwa bitewe n’uko ibihe bimeze bitagishoboka kubona neza muri m 200 bishobora kugaragazwa inyuma n’amatara 2 atukura, bipfa kuba bitarenza ibipimo bikurikira:$q$,NULL,$q$kutarenza umuvuduko wa km20 mu isaha$q$,NULL,$q$uburebure bwabyo habariwemo ibyo bitwaye bukaba butarengeje m6$q$,NULL,$q$uburebure ntarengwa ntiburenga m8$q$,NULL,$q$A na B nibyo bisubizo by’ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo romoruki iziritse ku kinyamitende, velomoteri n’amapikipiki bidafite akanyabiziga ko kuruhande uretse ikinyamitende na velomoteri bidafite umuyobozi, iyo uburumbarare bwayo cyangwa bw’ibyo yikoreye bituma itara ry’ikinyabiziga gikurura ritagaragara igihe bitagishoboka kubona neza muri m 200 bigomba kugaragazwa ku buryo bukurikira:$q$,NULL,$q$itara ryera cyangwa ry’umuhondo cyangwa risa n’icunga rihishije riri kuri rumoruki inyuma$q$,NULL,$q$itara ry’icyatsi cyangwa ry’umuhondo cyangwa risa n’icunga rihishije riri kuri rumoruki inyuma$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ku kinyabiziga cyangwa ibinyabiziga bikururana igice kirenga ku biziga ntikigomba kurenga ibipimo bikurikira:$q$,NULL,$q$inyuma ni m 3 na cm 50$q$,NULL,$q$imbere ni m 1 na cm 70$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo amatara y’ikinyabiziga agomba gucanwa kandi igihe imizigo isumba impera y’ikinyabiziga ho metero irenga igice gihera cy’imizigo kigaragazwa ku buryo bukurikira:$q$,NULL,$q$itara ritukura cyangwa akagarurarumuri ku mutuku ku manywa$q$,NULL,$q$agatambaro gatukura gafite nibura cm 50 z’uruhande mu ijoro$q$,NULL,$q$itara ry’umuhondo cyangwa akagarurarumuri k’umuhondo$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$itara ritukura cyangwa akagarurarumuri ku mutuku nijoro ; agatambaro gatukura gafite nibura cm 50 z’uruhande kunamanywa$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo imizigo igizwe n’ibinyampeke, ikawa, ipamba idatonoye, ibishara, ibyatsi, ibishami cyangwa ubwatsi bw’amatungo bidahambiriye uretse amapaki afunze, ubugari bwayo bushobora kugera ku bipimo bikurikira:$q$,NULL,$q$m 2.50$q$,NULL,$q$m 2.75$q$,NULL,$q$m 3$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uretse mu mijyi kuyindi mihanda yagenywe na minisiteri ushinzwe gutwara ibintu n’abantu, uburemere ntarengwa bwemewe ku binyabiziga bifatanye bifite imitambiko itatu ni:$q$,NULL,$q$toni 20$q$,NULL,$q$toni 16$q$,NULL,$q$toni 12$q$,NULL,$q$toni 10$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Buri modoka cyangwa buri romoruki ikuruwe n’iyo modoka bishobora kugira itara rituma umuyobozi yerekana ko yabonye ikimenyetso cy’uwitegura kumunyuraho. Iryo tara rifite amabara akurikira:$q$,NULL,$q$umuhondo$q$,NULL,$q$icyatsi kibisi$q$,NULL,$q$umweru$q$,NULL,$q$umutuku$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q64: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu gihe utwaye ikinyabiziga uva kuri A ugana kuri B, Iki kimenyetso kiri mu muhanda kivuze iki ?$q$,NULL,$q$Umuyobozi w’ikinyabiziga ashobora kunyuranaho arenze umurongo wera udacagaguye$q$,NULL,$q$Umuyobozi w’ikinyabiziga abujijwe kunyuranaho arenze imirongo yera$q$,NULL,$q$Umuyobozi w’ikinyabiziga yemerewe kunyuranaho$q$,NULL,$q$Abayobozi b’ibinyamitende gusa bemerewe kunyuranaho barenze umurongo wera udacagaguye$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Bumwe muri ubu bwoko bwa feri ituma imodoka iguma aho iri uko yaba yikoreye kose ku muzamuko cyangwa ku gacuri bya 16%, imyanya ya feri igomba gufata igakomeza kwegera kuburyo bw’ibyuma niyo umuyobozi yaba atarimo:$q$,NULL,$q$feri yo guhagarara umwanya munini$q$,NULL,$q$feri y’urugendo$q$,NULL,$q$feri yo gutabara$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Utugarurarumuri turi mu mbavu z’ikinyabiziga tugomba kugira ibara rikurikira:$q$,NULL,$q$umweru$q$,NULL,$q$umuhondo$q$,NULL,$q$umutuku$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Romoruki zifite ubugari ntarengwa bwa cm 80 zishobora gushyirwaho akagarurarumuri kamwe gusa iyo zikuruwe n’ibinyabiziga bikurikira:$q$,NULL,$q$velomoteri$q$,NULL,$q$ipikipiki idafite akanyabiziga ku ruhande$q$,NULL,$q$amavatiri y’ifasi$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara maremare y’ibara ryera cyangwa ry’umuhondo agomba, nijoro igihe ijuru rikeye, kumurika mu muhanda mu ntera ya m 100 nibura imbere y’ikinyabiziga, ariko ku binyabiziga bifite moteri itarengeje za sentimetero kibe 125 iyo ntera igira ibipimo bikurikira:$q$,NULL,$q$m200$q$,NULL,$q$m100$q$,NULL,$q$m85$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$m75$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo banyuze iruhande rw’inkomyi abanyamaguru bagomba gukikira banyuze mu muhanda, abayobozi bagomba gusiga umwanya ufite ubugari bwa m 1 nibura hagati yabo nayo. Iyo ibyo bidashobora kubahirizwa kandi umunyamaguru akaba anyura hafi yiyo nkomyi, umuyobozi agomba kuyikikira afite umuvuduko utarengeje ibipimo bikurikira:$q$,NULL,$q$km 10 mu isaha$q$,NULL,$q$km 20 mu isaha$q$,NULL,$q$km 30 mu isaha$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$km 5 mu isaha$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Guhagarara akanya gato no guhagarara akanya kanini bibujijwe cyane cyane aha hakurikira:$q$,NULL,$q$ku mihanda y’icyerekezo kimwe hose$q$,NULL,$q$mu ruhande ruteganye n’urwo ikindi kinyabiziga gihagazemo akanya gato cyangwa kanini$q$,NULL,$q$ku mihanda ibisikanirwamo, iyo ubugari bw’umwanya w’ibinyabiziga ugomba gutuma bibisikana butagifite m12$q$,NULL,$q$ibisubizo byose nibyo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara ndangambere n’aya ndanganyuma y’imodoka zitarengeje m 6 z’uburebure na m 2 z’ubugari habariwemo imitwaro kdi nta kinyabiziga kindi kiziritseho ashobora gusimburwa n’amatara akurikira, iyo ibyo binyabiziga bihagaze umwanya muto cyangwa munini mu nsisiro bibangikanye ku ruhande rw’umuhanda:$q$,NULL,$q$amatara magufi$q$,NULL,$q$amatara ndangaburumbarare$q$,NULL,$q$amatara yo guhagarara umwanya munini$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo kuva bwije kugeza bukeye cyangwa bitewe nuko ibihe bimeze nk’igihe cy’igihu cyangwa cy’imvura bitagishoboka kubona neza muri m 200, imirongo y’ingabo z’igihugu zigendera kuri gahunda n’utundi dutsiko twose tw’abanyamaguru nk’imperekerane cyangwa udutsiko tw’abanyeshuri bari ku murongo bayobowe na mwarimu, iyo bagenda mu muhanda ku isonga hakaba hari abantu barenze umwe, bagaragzwa ku buryo bukurikira:$q$,NULL,$q$imbere ni itara ryera ritwariwe ku ruhande rw’ibumoso n’umuntu uri ku murongo w’imbere hafi y’umurongo ugabanya umuhanda mo kabiri$q$,NULL,$q$inyuma ni itara umuhondo ritwariwe ku ruhande rw’ibumoso n’umuntu uri ku murongo w’inyuma hafi y’umurongo ugabanya umuhanda mo kabiri$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Imizigo yikorewe n’amagare, velomoteri, amapikipiki, ibinyamitende by’ibiziga bitatu nibyo ibiziga bine bifite cyangwa bidafite moteri inyuma ntishobora kurenza ibipimo bikurikira:$q$,NULL,$q$cm 20$q$,NULL,$q$cm 30$q$,NULL,$q$cm 50$q$,NULL,$q$cm 60$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Itara ndanganyuma rigomba gushyirwa aha hakurikira:$q$,NULL,$q$ahagereye inguni y’ibumoso y’ikinyabiziga$q$,NULL,$q$ahagereye inguni y’iburyo bw’ikinyabiziga$q$,NULL,$q$inyuma kandi y’impera y’ibumoso bw’ikinyabiziga$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Nta tara na rimwe cyangwa utugarurarumuri bishobora kuba bifunze kuburyo igice cyabyo cyo hasi cyane kimurika kitaba kiri hasi ya cm 40 kuva ku butaka igihe ikinyabiziga kidapakiye ariko ibyo ntibikurikizwa ku matara akurikira:$q$,NULL,$q$amatara kamenabihu$q$,NULL,$q$amatara yo gusubira inyuma$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo tumuritswe n’amatara y’urugendo y’i kinyabiziga utugarurarumuri tugomba n’ijoro, igihe ijuru rikeye kubonwa n’umuyobozi w’ikinyabiziga kiri mu ntera ikurikira:$q$,NULL,$q$metero 100$q$,NULL,$q$metero 150$q$,NULL,$q$metero 200$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bigendeshwa na moteri, hatarimo velomoteri n’ibinyabiziga bidapakiye umuvuduko wabyo udashobora kurenga km 50 mu isaha ahateganye bigomba kuba bifite ibikoresho by’ihoni byumvikanira mu ntera ikurikira:$q$,NULL,$q$metero 200$q$,NULL,$q$metero 150$q$,NULL,$q$metero 100$q$,NULL,$q$metero 50$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ahatari mu nsisiro ibyapa biburira n’ibyapa byo gutambuka mbere bigomba gushyirwa mu ntera ikurikira y’ahantu habyerekana:$q$,NULL,$q$metero 150 kugeza kuri 200$q$,NULL,$q$metero 100 kugeza kuri 150$q$,NULL,$q$metero 50 kugeza kuri 100$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Inkombe z’inzira nyabagendwa cyangwa z’umuhanda zishobora kugaragazwa n’ibikoresho ngarurarumuri. Ibyo bikoresho bigomba gushyirwaho ku buryo abagenzi babibona ku buryo bukurikira:$q$,NULL,$q$babona iburyo bwabo ibyibara ritukura cyangwa ibisa n’icunga rihishije$q$,NULL,$q$ibumoso babona iby’ibara ryera$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ahatari mu nsisiro, umuyobozi wese ugenza ikinyabiziga kimwe cyangwa ibinyabiziga bikomatanye bifite uburemere ntarengwa bwemewe burenga ibiro 3500 cyangwa bifite uburebure bwite burenga metero 10 agomba, keretse iyo anyuze cyangwa agiye kunyura ku bindi binyabiziga, gusiga hagati y’ikinyabiziga cye n’iki muri imbere umwanya uhagije kugirango ibinyabiziga bimuhiseho bishobore kuhigobeka bidateje impanuka igihe bibaye ngombwa ariko ibyo ntibikurikizwa mu bihe bikurikira:$q$,NULL,$q$mu gihe ibigendera mu muhanda ari byinshi kimwe no mu duce tw'inzira nyabagendwa aho kunyuranaho bibujijwe$q$,NULL,$q$igihe ibigendera mu muhanda ari byinshi$q$,NULL,$q$mu duce tw’inzira nyabagendwa aho kunyuranaho bibujijwe$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara ndangacyerekezo agomba kuba agizwe n’ibintu bifashe ku rumuri rumyasa, biringaniye ku buryo bigira umubare utari igiharwe ku mpande z’imbere n’inyuma z’ikinyabiziga ayo matara aba afite amabara akurikira:$q$,NULL,$q$amatara y’imbere aba yera cyangwa ari umuhondo$q$,NULL,$q$ayinyuma aba atukura cyangwa asa n’icunga rihishije$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$ayinyuma aba asa n’icunga rihishije$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amahoni y’ibinyabiziga bigendeshwa na moteri agomba kohereza ijwi ry’injyana imwe rikomeza kandi ridacengera amatwi ariko ibinyabiziga bikurikira bishobora kugira ihoni ridasanzwe ridahuye n’ibivuzwe haruguru:$q$,NULL,$q$ibinyabiziga ndakumirwa$q$,NULL,$q$ibinyabiziga bikora ku mihanda$q$,NULL,$q$ibinyabiziga bifite ubugari burenze m 2.10$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa kibuza kunyura kubindi binyabiziga byose uretse ibinyamitende ibiri n’amapikipiki adafite akanyabiziga ku ruhande gifite ibimenyetso by’amabara akurikira:$q$,NULL,$q$umweru n’umukara$q$,NULL,$q$umutuku n’umukara$q$,NULL,$q$ubururu$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa kivuga ko hatanyurwa mu byerekezo byombi kirangwa n’ubuso bw’ibara rikurikira:$q$,NULL,$q$umukara$q$,NULL,$q$umweru$q$,NULL,$q$ubururu$q$,NULL,$q$umutuku$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bikurikira bigomba kugira ibikoresho by’ihoni byumvikanira mu ntera ya m 20:$q$,NULL,$q$amapikipiki$q$,NULL,$q$velomoteri$q$,NULL,$q$ibinyabiziga bigendeshwa na moteri bidapakiye$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Imirongo y’ingabo z’igihugu zigendera kuri gahunda n’utundi dutsiko twose tw’abanyamaguru nk’imperekerane cyangwa udutsiko tw’abanyeshuri iyo bitagishoboka kubona neza muri m200, bagaragazwa ni itara ryera imbere naho inyuma ni itara ry’umutuku ariko iyo uburebure bwiyo mirongo cyangwa bw’utwo dutsiko burenga m6 impande zatwo cyangwa zayo zigaragazwa ku buryo bukurikira:$q$,NULL,$q$itara rimwe cyangwa menshi yera$q$,NULL,$q$amatara menshi y’umuhondo$q$,NULL,$q$amatara menshi asa n’icunga rihishije$q$,NULL,$q$ibisubizo byose nibyo$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara ndangambere na ndanganyuma y’imodoka zitarengeje m 6 z’uburebure na m 2 z’ubugari habariwemo imitwaro kandi nta kindi kinyabiziga kiziritseho ashobora gusimburwa n’amatara yo guhagarara umwanya munini iyo ibyo binyabiziga bihagaze umwanya muto cyangwa munini mu nsisiro bibangikanye ku ruhande rw’umuhanda. Ayo matara arangwa n’amabara akurikira:$q$,NULL,$q$umweru cyangwa umuhondo imbere$q$,NULL,$q$umutuku cyangwa umuhondo inyuma$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara ndangaburumbarare agomba kubonwa nijoro igihe ijuru rikeye n’umuyobozi w’ikinyabiziga kiri mu ntera ya :$q$,NULL,$q$m 50 nibura$q$,NULL,$q$m 100$q$,NULL,$q$m 150$q$,NULL,$q$m 200 nibura$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uretse ku byerekeye imihanda iromboreje y’ibisate byinshi n’imihanda yimodoka igice cy’umuhanda kiri hakurya y’umurongo mugari wera ucibwa ku muhanda ngo ugaragaze inkombe mpimbano zawo kigenewe ibi bikurikira:$q$,NULL,$q$guhagararwamo umwanya muto gusa$q$,NULL,$q$guhagararwamo umwanya munini gusa$q$,NULL,$q$guhagararwamo umwanya muto n’umunini$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibimenyetso by’agateganyo bigizwe n’imitemeri y’ibara risa n’icunga rihishije bishobora gusimbura ibi bikurikira:$q$,NULL,$q$imirongo yera irombereje idacagaguye gusa$q$,NULL,$q$imirongo yera irombereje idacagaguye n’icagaguye$q$,NULL,$q$imirongo icagaguye n’idacagaguye ibangikanye$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo bitagishoboka kubona muri m 200 imodoka zikuruwe n’inyamaswa, ingorofani, inyamaswa zitwaye imizigo cyangwa zigenderwamo kimwe n’amatungo bigomba kurangwa na :$q$,NULL,$q$imbere ni itara ryera$q$,NULL,$q$imbere ni itara ry’umuhondo cyangwa risa n’icunga rihishije$q$,NULL,$q$inyuma ni itara rimwe ritukura$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uretse igihe hari amategeko yihariye akurikizwa muri ako karere ikinyabiziga cyose gihagaze umwanya muto cyangwa munini, iyo gihagaze mu mwanya wo kuruhande wagenewe abanyamaguru, kugirango bashobore kugenda batagombye kunyura mu muhanda, umuyobozi agombye kubasigira akayira gafite byibura ibipimo bikurikira by’ubugari:$q$,NULL,$q$m 1$q$,NULL,$q$m 2$q$,NULL,$q$m 0.5$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cyerekana ahantu hagenewe guhagararwamo n’imodoka nini zagenewe gutwara abantu cyirangwa n’ubuso bw’amabara akurikira:$q$,NULL,$q$ubururu$q$,NULL,$q$umweru$q$,NULL,$q$umutuku$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cyerekana ko inzira giteyeho mu ntangiriro idakomeza kigaragazwa n’ikirango (ikimenyetso) cy’amabara akurikira:$q$,NULL,$q$umukara n’umutuku$q$,NULL,$q$umukara n’umweru$q$,NULL,$q$umweru n’umutuku$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Buri modoka yagenewe gutwara abantu, ariko umubare wabo ntarengwa ukaba munsi ya 6 umuyobozi abariwemo igomba kugira imikandara yo kurinda ibyago igenewe aba bakurikira:$q$,NULL,$q$umuyobozi$q$,NULL,$q$umugenzi wicaye ku ntebe y’imbere$q$,NULL,$q$ishobora no kugira imikandara kuzindi ntebe z’inyuma$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Usibye ibinyabiziga by'ingabo z'Igihugu, Ikinyabiziga kigendeshwa na moteri kiriho ibyuma ntamenwa cyangwa ikindi cyose gituma gikoreshwa mu gutera cyangwa mu kwitabara ntigishobora kugenda mu nzira nyabagendwa kidafite uruhushya rwihariye. Urwo ruhushya rutangwa naba bakurikira:$q$,NULL,$q$police y’igihugu$q$,NULL,$q$minisitiri ushinzwe gutwara abantu n’ibintu$q$,NULL,$q$minisitiri w’ingabo$q$,NULL,$q$ikigo cy’igihugu gishinzwe imisoro n’amahoro.$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo umukumbi ugizwe n’amatungo maremare arenze ane cyangwa amatungo magufi arenze atandatu mu nzira nyabagendwa iyo hatakibona neza kuburyo umuyobozi abona muri m 200 ugomba kugaragazwa kuburyo bukurikira:$q$,NULL,$q$itara ry’urumuri rwera cyangwa rusa n’icunga rihishije imbere y’umukumbi$q$,NULL,$q$itara ry’urumuri rutukura cyangwaumuhondo ritwawe inyuma y’umukumbi$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga biherekeranyije mu butumwa ntibishobora gutonda uburebure burenga umurongo wa m 500. Iyi bibaye bityo ibinyabiziga biherekeranye mu butumwa bishobora kugabanwamo amatsinda atonze umurongo atarengeje m 50 z’uburebure kdi hagati yayo hakaba byibura m 50 ariko ibyo ntibikurikizwa kubinyabiziga bikurikira:$q$,NULL,$q$ibinyabiziga bya police biherekeranyije$q$,NULL,$q$ibinyabiziga by’abasirikare biherekeranyije mu nsisiro$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo ikinyabiziga gikururwa n’inyamaswa nacyo gikuruye ikindi uburebure bw’ibikururwa bukaba burenga m 18 hatabariwemo icyo kinyabiziga cya mbere kiziritseho hagomba ibi bikurikira:$q$,NULL,$q$umuherekeza w’ikinyabiziga cya kabiri$q$,NULL,$q$abaherekeza babiri$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga bikurikira ntibitegetswe kugira ibimenyetso bibyerekana iyo byambukiranya umuhanda cyangwa bigenda ku ruhande rwawo:$q$,NULL,$q$ibinyabiziga bigendwamo n’abana$q$,NULL,$q$ibinyabiziga bigendwamo n’abamugaye$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cy’inyongera kigaragaza ikibanza cy’ingando cyangwa cy’abantu benshi bagendera ku nyamaswa kirangwa n’amabara akurikira:$q$,NULL,$q$ubururu, umweru n’umukara$q$,NULL,$q$umukara umweru n’umuhondo$q$,NULL,$q$icyatsi kibisi, umuhondo n’ikirango cy’umukara$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cyerekana ahantu amategeko y’ Umuhanda urombeje w’ibice byinshi atangirira gukurikizwa, kirangwa n’ibirango (ibimenyetso) by’amabara akurikira:$q$,NULL,$q$umweru n’umukara$q$,NULL,$q$umweru n’umutuku$q$,NULL,$q$umweru n’umuhondo$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$umweru n’ubururu$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igihe ikorwa ry’imirimo ribangamiye cyane cyangwa buke uburyo bwo kugenda mu nzira nyabagendwa, ahakorerwa imirimo hagaragazwa ku buryo bukurikira:$q$,NULL,$q$icyapa cyera cya mpande enye, zingana zifite uruhande rwa metero 0.30$q$,NULL,$q$uruzitiro ruri ku mpera y’iburyo$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$Ahitaruye hashyirwa ikimenyetso mubyapa biburira gifite nimero 20 ; nanone aho imirimo ikorerwa n’uruzitiro ku mpande zombi$q$,NULL),

  -- Q104: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo mu muhanda, imirimo yihariye ubugari butuma abayobozi bagomba kuva mu mwanya wabo usanzwe kugirango bakomeze urugendo, ahategetswe kunyurwa hagaragazwa n’ikimenyetso gishyirwa aho imirimo irangirira mu ruhande rugenderwamo. Icyo kimenyetso kirangwa n’amabara akurikira:$q$,NULL,$q$ubuso bw’ubururu ikirango cy’umweru$q$,NULL,$q$umuzenguruko w’umutuku, ubuso umweru n’ikirango cy’umukara$q$,NULL,$q$umuzenguruko w’umutuku, ubuso mu ibara ryera, ikirango mu ibara ry’umutuku n’umukara$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cyerekana ko hari amabwiriza yihariye mu buryo bwo kugendera mu cyambu cyangwa ku kibuga cy’indege giteye ku buryo bukurikira:$q$,NULL,$q$ishusho mpandeshatu, ubuso mu ibara ryera, ikirango mu ibara ry’umukara$q$,NULL,$q$ishusho mpandenye, ubuso mu ibara ry’ubururu n’ikirango kiri mu ibara ryera$q$,NULL,$q$ishusho y’uruziga mu ibara ry’ubururu ni ikirango kiri mu ibara ryera$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Nijoro igihe ijuru rikeye, itara ribonesha icyapa kiranga numero y’ikinyabiziga rigomba gutuma izo numero zisomerwa nibura mu ntera ikurikira:$q$,NULL,$q$m150$q$,NULL,$q$m50$q$,NULL,$q$m20$q$,NULL,$q$m10$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibyapa byerekana icyago cyidahoraho kandi bigenewe kwerekana aho bagana cyangwa aho berekeza umuhanda nk’igihe cy’impanuka cyangwa hari imirimo ikorwa mu muhanda birangwa n’amabara akurikira:$q$,NULL,$q$umweru n’umukara$q$,NULL,$q$umweru n’umuhondo$q$,NULL,$q$ubuso bw’umweru gusa$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$umweru; n’umutuku$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Birabujijwe kubangamira imigendere isanzwe y’ibindi binyabiziga kubera ibi bikurikira:$q$,NULL,$q$kugabanya umuvuduko kuburyo budasanzwe$q$,NULL,$q$gukacira feri bidatewe no kwirinda ibyago$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibiziga by’ibinyabiziga bigendeshwa na moteri n’ibya velomoteri kimwe n’ibya romoruki zabyo bigomba kuba byambaye inziga zihagwa zifite amano n’ubujyakuzimu butari munsi ya milimetero imwe ku migongo yabyo yose nubudodo bwabyo ntibugire ahantu na hamwe bugaragara kandi ntibugire aho byacitse bikomeye mu mpande zabyo ariko ibyo ntibikurikizwa ku binyabiziga bikurikira:$q$,NULL,$q$ibinyabiziga bidapakiye kandi bitajya birenza umuvuduko wa km 25 mu isaha ahateganye$q$,NULL,$q$ibinyabiziga bya police bijya ahatarenga km 25 uvuye aho biba$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara maremare y’ikinyabiziga agomba kuzimwa mu bihe bikurikira:$q$,NULL,$q$iyo umuhanda umurikiwe hose kandi umuyobozi ashobora kubona nibura mu ntera ingana na metero 100$q$,NULL,$q$iyo ikinyabiziga gikurikiye ikindi mu ntambwe zitagera muri m50 keretse iyo umuyobozi wacyo ashaka kunyura kucyo akurikiye acana azimya vuba vuba amatara maremare$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo akanyabiziga gasunikwa cyangwa ibyo gatwaye bidatuma umuyobozi abona neza imbere ye, uwo muyobozi agomba gukora ibi bikurikira:$q$,NULL,$q$gushaka umuherekeza$q$,NULL,$q$gukurura ikinyabiziga cye$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uretse igihe hari amategeko yihariye akurikizwa muri ako karere cyangwa imitunganyirize bwite y’aho, ikinyabiziga cyose cyangwa inyamaswa ihagaze umwanya muto cyangwa munini igomba kuba iri aha hakurikira:$q$,NULL,$q$mu kaboko k’iburyo hakurikijwe aho yaganaga uretse igihe ari mu muhanda w’icyerekezo kimwe$q$,NULL,$q$ahegereye bishobotse akayira k’abanyamaguru iyo umuhanda ugafite ariko umwanya w’ibiziga n’akayira ntube urenga santimetero 50$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo ikinyabiziga gihagaritswe n’ijoro ku buryo abayobozi bakigana badashobora kumenya ko kibabereye imbogamizi, kigomba kurangirwa kure n’ikimenyetso cyabigenewe kiri ahantu hagaragara kugirango kiburire hakiri kare abandi bayobozi baza bagisanga, ariko ntibireba ibinyabiziga bikurikira:$q$,NULL,$q$velomoteri$q$,NULL,$q$ipikipiki idafite akanyabiziga ku ruhande$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Abanyamaguru batatanye cyangwa bagize udutsiko tudafatanyije gahunda kdi batanayobowe n’umwarimu bategetswe kunyura mu tuyira turi ku mpande z’umuhanda no ku nkengero zigiye hejuru uretse ubutaka butsindagiye butandukanya imihanda ibiri bwo kunyurwamo gusa n’aba bakurikira:$q$,NULL,$q$abanyamaguru bashaka guhagarara akanya gato igihe bambukiranya umuhanda$q$,NULL,$q$abanyamaguru bagize udutsiko tw’abantu benshi$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyabiziga biherekeranyije mu butumwa ntibishobora gutonda uburebure burenga umurongo wa m 500, iyo bibaye bityo ibinyabiziga biherekeranyije mu butumwa bishobora kugabanywamo amatsinda atonze umurongo utarengeje ibipimo bikurikira:$q$,NULL,$q$utarengeje m50$q$,NULL,$q$utarengeje m100$q$,NULL,$q$utarengeje 150$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibyapa byereka inkomane y’inzira nyabagendwa n’inzira ya gariyamoshi bigomba iteka kumurikwa cyangwa kugarura urumuri ku buryo bigaragarira nibura mu ntera ikurikira igihe ijuru rikeye:$q$,NULL,$q$m200$q$,NULL,$q$m 250$q$,NULL,$q$m300$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$Metero 100$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Imbibi ziri ku mpera z’ubwihugiko bw’abanyamaguru kandi ziri mu muhanda kimwe n’imbibi n’ibindi bikoresho bigenewe gutuma bagenda mu muhanda nta muvundo zisigwa irangi ry’ibara rikurikira:$q$,NULL,$q$irangi ry’umuhondo ngarurarumuri$q$,NULL,$q$irangi ry’umweru ngarurarumuri$q$,NULL,$q$irangi risa n’icunga rihishije ngarurarumuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kugirango ikinyabiziga kive ahantu hari urwondo cyangwa hanyerera bidasanzwe hashobora gukoreshwa uburyo bukurikira:$q$,NULL,$q$inziga zishobora gushyirwaho udushyundu$q$,NULL,$q$inziga zishobora gushyirwaho iminyururu irwanya ubunyerere$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo imizigo igizwe n’ibinyampeke, ikawa, amakara, ubwatsi bw’amatungo bidahambiriye, ubugari bwayo bushobora kugera kuri m2 na cm75 ariko iyo iyo mizigo ijyanwa mu karere katarenga km25 uvuye aho yapakiriwe, usibye mu nsisiro, ubugari bwayo bushobora kugera ku bipimo bikurikira:$q$,NULL,$q$m4$q$,NULL,$q$m3 na cm50$q$,NULL,$q$m3$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu mujyi no ku mihanda y’igihugu igenwa na minisitiri ushinzwe gutwara abantu n’ibintu, ubwikorere ntarengwa ku ikamyo iyo ariyo yose ntibushobora kurenga ibipimo bikurikira:$q$,NULL,$q$toni 10$q$,NULL,$q$toni 16$q$,NULL,$q$toni 24$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$Toni 53$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo bitewe n’imiterere y’ahantu intera itandukanya icyapa n’ahantu habi iri munsi ya m150 ku buryo bugaragara, iyo ntera yerekanishwa icyapa cy’inyongera giteye ku buryo bukurikira:$q$,NULL,$q$kare ifite ubuso bw’ibara ryera$q$,NULL,$q$urukiramende rufite ubuso bw’ibara ryera$q$,NULL,$q$mpandeshatu ifite umuzenguruko utukura$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Nijoro, amatara yo kubisikana y’ibara ryera cyangwa y’umuhondo agomba, igihe ijoro rikeye kumurika mu muhanda nibura mu ntera ikurikira:$q$,NULL,$q$m100$q$,NULL,$q$m50$q$,NULL,$q$m40$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ikintu cyose cyatuma hahindurwa ibyanditse bireba nyirikarita cyangwa ibiranga ikinyabiziga kigomba kumenyeshwa ibiro by’umusoro haba mu magambo cyangwa mu ibaruwa ishinganye ibyo bikorwa mu gihe kingana gute:$q$,NULL,$q$mu mezi 2$q$,NULL,$q$mu kwezi kumwe$q$,NULL,$q$mu minsi cumi n’itanu$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$8$q$,NULL),

  -- Q124: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kugirango berekane ahantu habi cyane, hakoreshwa ikimenyetso cy’itara ry’umuhondo rimyasa, rivuga uburenganzira bwo gutambuka icyo kimenyetso barushijeho kwitonda. Ese icyo kimenyetso gihindura iki ku mategeko agenga gutambuka mbere:$q$,NULL,$q$ntacyo gihindura$q$,NULL,$q$abo rireba nibo batambuka mbere$q$,NULL,$q$abatwaye ibinyabiziga binini nibo batambuka mbere$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara maremare y’ibara ryera cyangwa ry’umuhondo agomba nijoro igihe ijuru rikeye kumurika mu ntera ikurikira ku binyabiziga bifite moteri itarengeje ingufu zigera kuri sentimetero kibe 125$q$,NULL,$q$m100$q$,NULL,$q$m75$q$,NULL,$q$m25$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo kuva bwije kugeza bukeye cyangwa bitewe n’uko ibintu bimeze bitagishoboka kubona muri m 200, ibinyabiziga cyangwa imitwaro bifite ubugari burenga m 2.50 iyo bigenda mu nzira nyabagendwa bigaragazwa ku buryo bukurikira:$q$,NULL,$q$inyuma ni amatara abiri atukura$q$,NULL,$q$iyo bibaye ngombwa no ku mpera y’amabondo y’ikinyabiziga cyangwa y’imitwaro ni itara ndangaburumbarare risa n’icunga rihishije cyangwa ry’umuhondo$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igice cy’umuhanda kiri hakurya y’umurongo mugari wera udacagaguye ugaragaza inkombe mpimbano y’umuhanda kiba kigenewe ibi bikurikira:$q$,NULL,$q$guhagararwamo umwanya muto gusa$q$,NULL,$q$guhagararwamo umwanya muto n’umunini ndetse no kumihanda irombereje y’ibisate byinshi n’imihanda y’imodoka$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$guhagararwamo umwanya muto cyangwa munini$q$,NULL),

  -- Q129: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu gihe utwaye ikinyabiziga uva kuri A ugana kuri B, Iki kimenyetso kiri mu muhanda kivuze iki ?$q$,NULL,$q$Umuyobozi ashobora kurenga umurongo wera udacagaguye mugihe cyo guhindukira gusa$q$,NULL,$q$Umuyobozi w’ikinyabiziga abujijwe kunyuranaho, uretse gusa abayobozi b’ibinyamitende nibo bashobora kurenga umurongo wera udacagaguye$q$,NULL,$q$Umuyobozi w’ikinyabiziga abujijwe kunyuranaho arenze umurongo wera udacagaguye$q$,NULL,$q$Umuyobozi w’ikinyabiziga ashobora kunyuranaho mu gihe bitateza icyago$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iminyururu n’ibindi byuma bifashisha bishobora kuvanwaho cyangwa binagana, hatabariwemo ibimenyetso byerekana ibyerekezo bigomba gutungurwa ku kinyabiziga ku buryo igihe byizunguza bitarenga impande zihera uburumbarare bw’ikinyabiziga kandi ibyo byuma bifashisha ntibigomba gukururuka ku butaka ariko ibyo ntibibujijwe ku binyabiziga bikurikira:$q$,NULL,$q$imashini zihinga$q$,NULL,$q$ibinyabiziga bitwaye ibintu bidashobora gufata inkongi$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ku binyabiziga cyangwa ibinyabiziga bikururana igice kirenga ku biziga ntigishobora kurenga ibipimo bikurikira:$q$,NULL,$q$iby’inyuma : m3$q$,NULL,$q$iby’imbere: m2.70$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uretse bibonewe uruhushya, ubundi birabujijwe gushyira no gukomeza kugendesha imodoka cyangwa romoruki mu nzira nyabagendwa iyo uburemere bw’ibyikorewe burenze uburemere ntarengwa bwemewe n’ikarita iranga ikinyabiziga ariko ibyo ntibikurikizwa ku binyabiziga bikurikira:$q$,NULL,$q$ibinyabiziga bya police$q$,NULL,$q$ibinyabiziga bihinga$q$,NULL,$q$imashini zikoreshwa mu kubaka imihanda$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Gushyira mu muhanda ku buryo budasanzwe ibinyabiziga bikururana birenze bitatu bigomba gutangirwa uruhusa, uretse imashini ihinga iyo zigenda uregendo rutarenze km 25, ibinyabiziga bikururana bitwaye ibyamamazwa n’ibindi biteganwa n’iri teka ariko igiteranyo cy’uburebure bw’ibyo binyabiziga bikururana ntigishobora kurenga ibipimo bikurikira:$q$,NULL,$q$m50$q$,NULL,$q$m35$q$,NULL,$q$m25$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibinyamitende itatu bifite moteri bigomba kugira amatara akurikira:$q$,NULL,$q$amatara abiri ndangambere n’amatara abiri ndanganyuma yerekana ko ikinyabiziga gihagaze$q$,NULL,$q$utugarurarumuri tubiri$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibyapa bibuza n’ibitegeka bikurikizwa gusa aha hakurikira:$q$,NULL,$q$mu masangano$q$,NULL,$q$mu gice cy’inzira nyabagendwa kiri hagati yaho bishinze n’inkomane ikurikiyeho ku ruhande rw’inzira bishinzeho$q$,NULL,$q$ibyo byapa bishyirwaho hakurikijwe intera ibitandukanya$q$,NULL,$q$B na C ni ibisubizo by’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cy’inyongera kerekana aho bagobokera ibinyabiziga kirangwa n’amabara akurikira:$q$,NULL,$q$ubururu, umweru, umutuku$q$,NULL,$q$umweru, umukara, ubururu$q$,NULL,$q$umutuku, umweru n’umukara$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q137: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cyerekana uburebure bw’igice cyatera ibyago cyangwa bw’ahantu amabwiriza y’icyo cyapa agomba gukurikizwa kirangwa n’ubuso n’ibimenyetso bikurikira:$q$,NULL,$q$ubuso umweru, ikimenyetso ubururu$q$,NULL,$q$ubuso ubururu, ikimenyetso umweru$q$,NULL,$q$ubuso ubururu, ikimenyetso umweru n’umukara$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$ubuso bw’umweru, n’ikimenyetso cy’umukara$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umurongo w’umuhondo ucagaguye uciye ku nkombe nyayo y’umuhanda, umusezero w’inzira y’abanyamaguru cyangwa w’inkengero y’umuhanda yegutse uvuga ibi bikurikira:$q$,NULL,$q$guhagarara umwanya muto birabujijwe ku burebure bw’uwo murongo$q$,NULL,$q$guhagarara umwanya muto n’umunini birabujijwe ku burebure bw’uwo murongo$q$,NULL,$q$aho bahagarara umwanya munini cyangwa muto$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$guhagarara umwanya munini birabujijwe ku burebure bw’uwo murongo$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ku binyabiziga cyangwa ibinyabiziga bikururana igice kirenga ku biziga ntigishobora kurenga ibipimo bikurikira:$q$,NULL,$q$iby’inyuma m 3.40$q$,NULL,$q$iby’imbere m 2.50$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$inyuma ni m 3,50 ; imbere ni m 2,70$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu migi no ku yindi mihanda y’igihugu igenwa na minisitiri ushinzwe gutwara abantu n’ibintu uburemere ntarengwa kuri buri mitambiko 3 ifungwaho ibiziga bine ni:$q$,NULL,$q$toni 24$q$,NULL,$q$toni 10$q$,NULL,$q$toni 16$q$,NULL,$q$toni 53$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo hagati y’uruhande rw’imbere rwa romoruki n’uruhande rw’inyuma rw’ikinyabiziga kiyikurura hari umwanya urenze m 3 ikibizirikanyije kigomba kugaragazwa ku buryo bukurikira iyo amatara y’ikinyabiziga agomba gucanwa:$q$,NULL,$q$agatambaro gatukura gafite nibura cm 50 z’uruhande$q$,NULL,$q$itara risa n’icunga rihishije rigaragara mu mbavu igihe ikibizirikanyije kimuritswe$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Birabujijwe kongera ku mpande z’ikinyabiziga kigendeshwa na moteri cyangwa velomoteri ibi bikurikira:$q$,NULL,$q$imitako$q$,NULL,$q$ibintu bifite imigongo cyangwa ibirenga ku mubyimba kandi bishobora gutera ibyago abandi bagenzi$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo ubugari bw’inzira nyabagendwa igenderwamo n’ibinyabiziga budahagije kugirango bibisikane nta nkomyi abagenzi bategetswe:$q$,NULL,$q$kunyura mu nzira z’impande z’abanyamaguru$q$,NULL,$q$guhagarara aho bageze$q$,NULL,$q$koroherana$q$,NULL,$q$gukuraho inkomyi$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Birabujijwe guhagarara akanya kanini aha hakurikira:$q$,NULL,$q$mu duhanda tw’abanyamagare$q$,NULL,$q$mu duhanda twagenewe velomoteri$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Imirongo yera iteganye n’umurongo ugabanya umuhanda mo kabiri mu burebure bwawo ugaragaza:$q$,NULL,$q$ahanyurwa n’amagare na velomoteri$q$,NULL,$q$ahanyurwa n’ingorofani n’ibinyamitende$q$,NULL,$q$ahanyurwa n’abanyamaguru$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo ikinyabiziga kitagikora cyangwa cyoherejwe mu mahanga burundu ibyapa ndanga bigomba gukurwaho bikoherezwa mu biro by’imisoro, ibyo bikorwa mu gihe kingana gute:$q$,NULL,$q$ibyumweru bibiri$q$,NULL,$q$amezi abiri$q$,NULL,$q$ukwezi kumwe$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ku mihanda yagenwe na minisitiri ubifite mu nshingano ibyapa biburira n’ibyapa byerekana bigomba kugaragazwa kuva bwije kugera bukeye n’urumuri rwihariye cyangwa amatara ku mihanda cyangwa ibintu ngarurarumuri. Igihe ijuru rikeye intera y’ahagaragara igomba kuba nibura:$q$,NULL,$q$m50$q$,NULL,$q$m120$q$,NULL,$q$m150$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$metero 100$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo nta mategeko awugabanya by’umwihariko umuvuduko ntarengwa ku modoka zidafite ibizibuza kwiceka kuberako ariko zakozwe ni:$q$,NULL,$q$km 70 mu isaha$q$,NULL,$q$km 40 mu isaha$q$,NULL,$q$km 25 mu isaha$q$,NULL,$q$km20 mu isaha$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu gihe telefone yawe ihamagawe utwaye imodoka wakora iki?$q$,NULL,$q$Kwitaba cyangwa guhagarara ako kanya$q$,NULL,$q$kutayitaba$q$,NULL,$q$Gushyira imodoka iruhande ukayitaba$q$,NULL,$q$B na c ni ibisubizo byukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki wakora mbere y’uko uhindura icyerekezo?$q$,NULL,$q$Gutanga ikimenyetso cy’ukuboko no gukoresha amatara ndangacyerekezo.$q$,NULL,$q$Itegereze neza niba icyapa kikwemerera guhindura icyerekezo.$q$,NULL,$q$A na B n’ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki muribi wakwirinda mugihe ushaka kunyuranaho?$q$,NULL,$q$Nyuma y’ikona ugategereza kubona uburyo bwo kunyuranaho.$q$,NULL,$q$Mumuhanda w’icyerekezo kimwe$q$,NULL,$q$Aho utagomba kurenza ibirometero 30 mu isaha.$q$,NULL,$q$Ugeze mumuhanda utaringaniye neza$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki wakora mugihe usanze mu bimenyetso bimurika harimo ibara ry’umuhondo.$q$,NULL,$q$Kongera umuvuduko$q$,NULL,$q$Kugumana umuvuduko wari uriho.$q$,NULL,$q$Kwitegura guhagarara.$q$,NULL,$q$Gufata feri cyane.$q$,NULL,$q$C$q$,NULL,NULL),
  -- Q153: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mugihe ukurikiranye na romoruki,n’ukubera iki ugomba gusiga umwanya uhagije hagati yawe nayo?$q$,NULL,$q$Bituma ubasha gukata ikorosi vuba.$q$,NULL,$q$Bifasha umuyobozi wa romoruki kukurebera mundorerwamo.$q$,NULL,$q$Bifasha romoruki guhagarara byoroshye.$q$,NULL,$q$Bikurinda umuyaga.$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Utegereje gukata iburyo kwiherezo ry’umuhanda.ukingirijwe nimodoka ihagaze.niki wakora?$q$,NULL,$q$Guhagarara hanyuma ukagenda gake gake witonze kugezaho ureba neza.$q$,NULL,$q$Kwihuta wegera imbere aho ushobora kureba ugafunga ikindi cyerekezo.$q$,NULL,$q$Gutegereza abanyamaguru bakakumenyesha ko ntakibazo wakata.$q$,NULL,$q$Guhindukiza imodoka vuba kugirango ushake indi nzira wakoresha.$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mugihe uri murugendo rurerure mumuhanda urombereje w’ibice byinshi.niki wakora mugihe wumva utangiye kugira ibitotsi?$q$,NULL,$q$Gucuranga umuziki cyane.$q$,NULL,$q$Kwihuta cyane kugirango usoze urugendo vuba.$q$,NULL,$q$Kuva mumuhanda urombereje w’ibice byinshi, ugahagarara ahantu hatekanye.$q$,NULL,$q$Ntagisubizo cy’ukuri kirimo.$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kuki ugomba gucana amatara mugihe hatangiye kwijima?$q$,NULL,$q$Kugirango akerekanamuvuduko kagaragare neza.$q$,NULL,$q$Kugirango abandi biborohere kukubona.$q$,NULL,$q$Kugira ngo ujyane nabandi bayobozi bibinyabiziga.$q$,NULL,$q$Kuko amatara yo ku muhanda ari kwaka$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Urimo kugenda munzira nyabagendwa ni gute wanyura k’umuyobozi w’igare?$q$,NULL,$q$Kuvuza ihoni mugihe umunyuraho$q$,NULL,$q$Kumunyuraho umwegereye$q$,NULL,$q$Gusiga umwanya uhagije igihe umunyuraho$q$,NULL,$q$Kugabanya umuvuduko mbere y’uko umunyuraho$q$,NULL,$q$C$q$,NULL,NULL),
  -- Q158: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki wakora igihe utabona neza usubira inyuma ?$q$,NULL,$q$Kumanura ikirahure cy’imodoka urebe inyuma$q$,NULL,$q$Gufungura umuryango w’imodoka ureba inyuma$q$,NULL,$q$Gushaka umuntu uri hanze y’ikinyabiziga ukuyobora$q$,NULL,$q$Gukoresha akarebanyuma kakwegereye$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igihe ukurikiwe n’ikinyabiziga gitwara abarwayi gicanye amatara y’intabaza arabagirana. Wakora iki ? i. Kugihigamira ako kanya ndetse byaba ngombwa ugahagarara$q$,NULL,NULL,NULL,$q$Kongera umuvuduko kugirango ugisige$q$,NULL,$q$Kugumana umuvuduko wari ufite$q$,NULL,$q$Guhagarara bitunguranye mu muhanda$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q160: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Wifuza kugana ibumoso imbere yawe. kubera iki ushaka umwanya mwiza kandi uhagije?$q$,NULL,$q$Kwemerera abandi bayobozi b’ibinyabiziga kugutambukaho$q$,NULL,$q$Kugirango ubone neza ikindi kerekezo ushaka gufata$q$,NULL,$q$Kugirango ufashe abandi bose bakoresha umuhanda icyo ushaka gukora$q$,NULL,$q$Kwemerera abandi bayobozi b’ibinyabiziga kukunyura muruhande rw’ibumoso$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Utwaye ikinyabiziga inyuma ya romoruki.umuyobozi wayo akaguha ikimenyetso cyo kumutambukaho iburyo kandi ugana ibumoso, wakora iki ?$q$,NULL,$q$Kugabanya umuvuduko ukareka akagenda$q$,NULL,$q$Gukomeza iburyo bwawe$q$,NULL,$q$Kumunyuraho iburyo bwe$q$,NULL,$q$Kugumana umuvuduko wari ufite ukamuvugiriza ihoni$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Wegereye inzira y’abanyamaguru ugasanga bategereje kwambuka. Ugomba gukora iki?$q$,NULL,$q$Kureka abakuze n’abafite ubumuga bagatambuka mbere$q$,NULL,$q$Kugabanya umuvuduko witegura guhagarara$q$,NULL,$q$Gukoresha amatara abamenyesha kwambuka$q$,NULL,$q$Gukoresha ibimenyetso byamaboko bibemerera kwambuka$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q163: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki kimenyetso kiri mu muhanda kivuze iki ?$q$,NULL,$q$Umuyobozi abujijwe kurenga umurongo wera ucagaguye cyeretse mugihe bitateza icyago$q$,NULL,$q$Birabujijwe kunyuranaho$q$,NULL,$q$Biremewe kunyuranaho ariko nturenge umurongo wera ucagaguye$q$,NULL,$q$Birabujijwe gusubira inyumo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kumanywa urumuri rudahagije hatabona neza .Ni ayahe matara y’urugendo ugomba gukoresha.$q$,NULL,$q$Amatara yo kubisika na matara kamena-bihu.$q$,NULL,$q$Amatara kamena-bihu y’imbere$q$,NULL,$q$Amatara yo kubisikana$q$,NULL,$q$Amatara kamena-bihu y’inyuma$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niyihe mpamvu ituma tugomba kugabanya umuvuduko mugihe hari ibihu ?$q$,NULL,$q$Igihe feri idakora$q$,NULL,$q$Igihe uhumishijwe n’amatara yo kubisikana$q$,NULL,$q$Igihe moteri imara ngo izime$q$,NULL,$q$Nuko biba bitoroshye kubona ikiri imbere$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki ugomba gukora igihe uhagaze ku muhanda igihe cy’ibihu?$q$,NULL,$q$Kureka amatara yo k,ubisikana na kamena-bihu akaguma yaka$q$,NULL,$q$Kureka amatara yo kubisikana akaguma yaka$q$,NULL,$q$Kureka amatara y’urugendo akaguma yaka$q$,NULL,$q$Kureka amatara ndanga akaguma yaka$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q167: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa cyivuga iki?$q$,NULL,$q$Umuvuduko ntarengwa 30 km/h$q$,NULL,$q$Iherezo ry’umuvuduko muke ntarengwa utegetswe. herezo ry’Umuvuduko muto utegetswe Umuvuduko uri hejuru 30 km/h$q$,NULL,NULL,NULL,NULL,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa gikurikira kivuze iki?$q$,NULL,$q$Ntihanyurwa$q$,NULL,$q$Birabujijwe guhagarara umwanya munini$q$,NULL,$q$Umuvuduko utarengeje$q$,NULL,$q$Inzira yabanyeshuli$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Inzira nyabagendwa ifite ibyerekezo bibiri, uruhande rw’ibumoso rudufasha iki ?$q$,NULL,$q$Kunyuranaho gusa, ntugaruke iburyo bwawe$q$,NULL,$q$Kunyuranaho cyangwa ugakatira ibumoso$q$,NULL,$q$Hemerewe kugenda imodoka zihuta gusa$q$,NULL,$q$Gukatira iburyo gusa utanyuranyeho$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni hehe byemewe kunyuranaho munzira y’icyerekezo kimwe?$q$,NULL,$q$ku gisate kiri Ibumoso bw’umuhanda$q$,NULL,$q$Kunyuranaho ntibyemewe$q$,NULL,$q$Ku gisate kiri iburyo bw’umuhanda gusa$q$,NULL,$q$Ku gisate cy’ibumoso cyangwa iburyo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$N’uwuhe muntu ushobora gusimbura ibimenyetsobyo mumuhanda, dutegetswe kubaha?$q$,NULL,$q$Umuyobozi w’ikinyamitende$q$,NULL,$q$Umunyamaguru$q$,NULL,$q$Umukozi ubifitiye ububasha$q$,NULL,$q$Umuyobozi wa bisi$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q172: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Iherezo ry’ibibuzwa byose mu karere ku binyabiziga bigenda$q$,NULL,$q$Ntihemerewe kuhahagarara$q$,NULL,$q$Umuvuduko ntarengwa wemewe$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q173: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibyapa bitegeka bikozwe muyihe shusho?$q$,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,$q$C$q$,NULL,NULL),

  -- Q174: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Nikihe cyapa cyerekena ko nta kinyabiziga gifite moteri cyemerewe kuhanyura?$q$,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,$q$B$q$,NULL,NULL),

  -- Q175: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$iki cyapa gisobanura iki ?$q$,NULL,$q$Uburenganzira bwo gutambuka mbere$q$,NULL,$q$Nta kinyabiziga kigendeshwa na moteri$q$,NULL,$q$ibyerekezo bibiri by’umuhanda$q$,NULL,$q$Birabujijwe kunyuranaho$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q176: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Imbere yawe iki cyapa kikubwiye iki ?$q$,NULL,$q$Umuvuduko ntarengwa wemewe$q$,NULL,$q$Iherezo ry’ibyo wabuzwaga$q$,NULL,$q$Guhagarara umwanya munini n’umwanya muto ntibyemewe$q$,NULL,$q$Birabujijwe kuhinjira$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q177: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Umuhanda uzenguruka$q$,NULL,$q$Igice cy’umuhanda uzenguruka$q$,NULL,$q$Aho banyura bazengurutse$q$,NULL,$q$Ibisubizo byose nibyo$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q179: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisubanura iki?$q$,NULL,$q$Iteme ridahoraho$q$,NULL,$q$Umuhanda utaringaniye$q$,NULL,$q$Umuhanda w’injira mu kuzimu$q$,NULL,$q$Ubutaka bworoshye$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q180: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Umuyaga w’intambike$q$,NULL,$q$Urusaku rwo mu muhanda$q$,NULL,$q$Ikibuga cy’indege Ibisubizko byose nibyo$q$,NULL,NULL,NULL,$q$A$q$,NULL,NULL),

  -- Q181: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki Cyapa Gisobanura Iki?$q$,NULL,$q$Iherezo Ry’inzira Y’abanyamaguru$q$,NULL,$q$Iherezo Ry’umuhanda Urombereje W’ibice Byinshi$q$,NULL,$q$A Na B Ni Ibisubizo By’ukuri$q$,NULL,$q$Nta nzira ihari$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q182: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura Iki?$q$,NULL,$q$Iherezo Ry’umuhanda Wi Byerekezo Bibiri$q$,NULL,$q$Iteme rinini Kandi rirerire$q$,NULL,$q$Ifungana Ry’umuhanda$q$,NULL,$q$Iherezo ry’iteme rifunganye$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q183: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Inzira idakomeza$q$,NULL,$q$Isangano rifite ishusho ya T$q$,NULL,$q$Aho baterefonera$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q184: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Inzira y’abanyeshuri$q$,NULL,$q$Abanyamaguru ntibemerewe$q$,NULL,$q$Agace k’abanyamaguru nta kinyabiziga$q$,NULL,$q$Hegereye aho abanyamaguru bambukira$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q185: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$wakora iki ubonye icyi cyapa ?$q$,NULL,$q$guhagarara gusa igihe ibinyabiziga bikwegereye$q$,NULL,$q$guhagarara niyo nta kinyabiziga ubona$q$,NULL,$q$Guhagarara gusa niba hari abana bategereje kwambuka$q$,NULL,$q$Guhagarara gusa igihe ikimenyetso cyaka ari umutuku$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q186: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Uguhinguka ku mwaro cyangwa ku nkombe cyangwa ahegereye icyome$q$,NULL,$q$Umuhanda wangijwe n’isuri$q$,NULL,$q$Hanyurwa nimodoka gusa$q$,NULL,$q$Umuhanda unyerera$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q187: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Hanyurwa na velomoteri gusa$q$,NULL,$q$Nta modoka$q$,NULL,$q$Hanyurwa nimodoka gusa$q$,NULL,$q$Ntihanyurwa n’amapikipiki$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q188: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa kikubwira gutanga inzira kigira iyihe shusho?$q$,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,$q$D$q$,NULL,NULL),

  -- Q189: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Ahegereye amasangano y’inzira nyabagendwa n’inzira ya gari ya moshi ibambiye$q$,NULL,$q$Inzira ibambiye imbere$q$,NULL,$q$Inzira itabambiye itanafunze$q$,NULL,$q$hari ikiraro cy’amatungo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q190: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Umuhanda wubatswe nabi$q$,NULL,$q$Agacuri kateza ibyago$q$,NULL,$q$Umuhanda utaringaniye$q$,NULL,$q$Akazamuko gahanamye$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q191: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Guhindura icyerekezo ibumoso ugana aho bahagarara$q$,NULL,$q$Umuhanda udakomeza$q$,NULL,$q$Nti byemewe guhindura icyerekezo ibumoso$q$,NULL,$q$Guhindura ikirekezo ibumoso ugana ku cyome$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu bimenyetso bimurika itara ritukura rivuga iki ?$q$,NULL,$q$Hagarara kereste niba ushaka gukata ibumoso$q$,NULL,$q$Birabujijwe kurenga icyo kimenyetso$q$,NULL,$q$Wemerewe kugenda$q$,NULL,$q$Ntagisubizo kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mubimenyetso bimurika itara ry’umuhondo risobanura iki ?$q$,NULL,$q$Itegure kugenda$q$,NULL,$q$Birabujijwe gutambuka umurongo wo guhagarara umwanya muto cg igihe uwo murongo udahari icyo kimenyetso ubwacyo$q$,NULL,$q$A na b ni ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mubimenyetso bimurika itara ry’icyatsi risobanura iki ?$q$,NULL,$q$Kwitegura kugenda$q$,NULL,$q$Uburenganzira bwo kurenga icyo kimenyetso$q$,NULL,$q$Hagarara niba inzira isohoka mu isangano ry’imihanda ifunze$q$,NULL,$q$Ntagisubizo cyukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umurongo ucagaguye wera mu muhanda usobanura iki?$q$,NULL,$q$Birabujijwe kuwurenga Birabujijwe kuhahagarara$q$,NULL,$q$Wegereye ahaguteza ibyago$q$,NULL,NULL,NULL,$q$Kunyuranaho ntibyemewe$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q196: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Ukugendera mu muhanda ubisikanirwamo$q$,NULL,$q$Ukugendera mu muhanda ubisikanirwamo ntibyemewe$q$,NULL,$q$Cyerekana aho umunyegare agomba kunyura$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q197: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Ahatangirwa serivisi ni muri metero 30.$q$,NULL,$q$Umuvuduko munini ntarengwa utegetswe ni 30 km/h.$q$,NULL,$q$Umuvuduko muto ntarengwa utegetswe ni 30 km/h.$q$,NULL,$q$Aho ibinyabiziga bihagarara ni imbere mu birometero 30.$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q198: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Ahegereye umuhanda unyerera.$q$,NULL,$q$Imbere ipine ryapfumutse.$q$,NULL,$q$Ahegereye icyago kidasobanuye ukundi.$q$,NULL,$q$Imbere hari hatangirwa serivisi.$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q199: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Imbere hari umuyobozi w’amatungo.$q$,NULL,$q$Imbere hari inzira ya gari ya moshi.$q$,NULL,$q$Ahegereye amasangano y’inzira nyabagendwa n’inzira ya gari ya moshi hatabambiye$q$,NULL,$q$Inkomane ibambiye.$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q200: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Muri iri sangano ry’umuhanda hari icyapa gisobanura “guhagarara” n’umurongo wera urombereje munzira . Niyihe mpamvu hari iki cyapa cyo “guhagarara” hano?$q$,NULL,$q$Biragoye kubona neza mu muhanda munini$q$,NULL,$q$Umuvuduko mu muhanda munini wavanyweho$q$,NULL,$q$Ni mwisangano ry’umuhanda rikoreshwa cyane$q$,NULL,$q$Hari imirongo iburira ibyago bitunguranye$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni iki gikenewe muri ibi bikurikira kugirango ubashe gutwara imodoka mu muhanda biteganywa nitegeko$q$,NULL,$q$Uruhushya rwa burundu rwo gutwara ibinyabiziga rugifite agaciro$q$,NULL,$q$Ubwishingizi bw’ikinyabizaga bugifite agaciro$q$,NULL,$q$Icyemezo cy’iyandikwa ry’ikinyabiziga \\$q$,NULL,$q$Ibisubizo byose nibyo$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ikinyabiziga gishya gikenerwa gusuzumwa bwambere nyuma y’igihe kingana iki ?$q$,NULL,$q$Nyuma y’umwaka umwe$q$,NULL,$q$Nyuma y’imyaka ibiri$q$,NULL,$q$A na b ni ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni ryari ushobora kwakiriza icyarimwe amatara yose ndangacyerekezo y’ikinyabiziga ?$q$,NULL,$q$Mu gihe ushaka kuburira abandi bakoresha umuhanda$q$,NULL,$q$Mu gihe ikinyabiziga cyawe gishobora guteza ibyago$q$,NULL,$q$A na b ni ibisubizo by’ukuri$q$,NULL,$q$Ntagisubizo cy’ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ugeze ahabereye impanuka yo mumuhanda bwambere ugasanga abakomeretse bikomeye. wakiriza icyarimwe amatara y’ibyerekezo byombi, niki kindi ushobora gukora?$q$,NULL,$q$Kumenya neza niba imbangukiragutabara yahamagawe$q$,NULL,$q$Guhagarika ibinyabiziga bindi no kubasaba ubufasha$q$,NULL,$q$A na b ni ibisubizo by’ukuri$q$,NULL,$q$Ntagisubizo kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q205: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabizaga cy’ikoreye ibintu bishobora gufata inkongi, n’ikihe cyapa cyerekana ko ibyo atwaye biturika by’afata inkongi ?$q$,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Wakoze impanuka yo mu muhanda , ni ikihe cyangombwa polisi ishobora kugusaba kucyerekana ?$q$,NULL,$q$Icyemezo cy’iyandikwa ryi ikinyabiziga$q$,NULL,$q$Uruhusa rwa burundu rwo gutwara ikinyabiziga Uruhushya rwagateganyo$q$,NULL,$q$Imikorere y’ikinyabiziga$q$,NULL,$q$Ikarita iranga ikinyabiziga$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uhuye n’ingorane utwaye ikinyabiziga , mu muhanda ufite ibyerekezo bibiri, ufite ikimenyetso kiburira cya mpandeshatu . wagishyira mu ntera ingana iki uvuye aho ikinyabiziga cyahagaze$q$,NULL,$q$Metero 5$q$,NULL,$q$Metero 25$q$,NULL,$q$Metero 45$q$,NULL,$q$Metero 100$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi usunika ipikipiki agomba gufatwa nka:$q$,NULL,$q$Umunyamaguru$q$,NULL,$q$Umuyobozi w’ikinyabiziga$q$,NULL,$q$Umugenzi$q$,NULL,$q$A na b ni ibisubizo by’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa gikoze mw’ishusho ya mpandeshatu kimenyesha:$q$,NULL,$q$ibyago ibibujijwe$q$,NULL,$q$ibitegetswe$q$,NULL,$q$ntagisubizo cy’ukuri kirimo$q$,NULL,NULL,NULL,$q$A$q$,NULL,NULL),

  -- Q210: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura :$q$,NULL,$q$uburenganzira bwo gutambuka mbere$q$,NULL,$q$uburenganzira bwo gutambuka mbere mu yandi masangano y’umuhanda akwegereye$q$,NULL,$q$ibyago imbere mu masangano y’umuhanda ukwegereye$q$,NULL,$q$a na b ni ibisubizo by’ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q211: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura:$q$,NULL,$q$Ntihanyurwa n’abanyamaguru$q$,NULL,$q$Akayira kabanyamaguru$q$,NULL,$q$Aho abanayamaguru bambukira$q$,NULL,$q$B na c ni ibisubizo by’ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Urenze munsisiro ,ukahasanga ibyapa bibiri iburyo bwawe bimenyesha ko irangira ry’imirimo bitewe nicyo ibyo byapa bemenyesha wagendera kuwuhe muvuduko ?$q$,NULL,$q$70 km/h$q$,NULL,$q$50 km/h$q$,NULL,$q$40 km/h$q$,NULL,$q$80 km/h$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q213: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki?$q$,NULL,$q$Hoteli$q$,NULL,$q$Ibitaro$q$,NULL,$q$Ahagenewe kugwa kajugujugu$q$,NULL,$q$B na c ni ibisubizo by’ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$igice kinzira nyabagendwa gikikijwe n’imirongo ibiri y’umweru iciyemo uduce kandi iteganye :$q$,NULL,$q$ahagenewe guhagarara umwanya munini n’umuto$q$,NULL,$q$ahagenewe abanayamaguru$q$,NULL,$q$ahagenewe inzira y’ibinyamitende$q$,NULL,$q$a na b ni ibisubizo by’ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q215: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$iki cyapa kibuza abayobozi bibinyabiziga kunyuranaho :$q$,NULL,$q$iburyo$q$,NULL,$q$ibumoso$q$,NULL,$q$iburyo n’ibumoso$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q216: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa kibuza kunyuranaho ibumoso ku binyabiziga bikurikira :$q$,NULL,$q$ku binyabiziga byose$q$,NULL,$q$ku binyabiziga byose bifite moteri$q$,NULL,$q$kubinyabiziga byose uretse ibinyamitende ibiri n’amapikipiki adafite akanyabiziga ko k’uruhande$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q217: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$iki kimenyetso cyaka kinyemerera gukomeza:$q$,NULL,$q$yego$q$,NULL,$q$yego ariko utanga inzira kubanyamaguru$q$,NULL,$q$yego utanga inzira kubandi bayobozi b’ibinyabizaga baturutse mukindi cyerekezo$q$,NULL,$q$oya$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu muhanda ufite uruhererekane rw’amakoni, feri y’urugendo ikoreshwa ryari?$q$,NULL,$q$Mbere ya buri koni$q$,NULL,$q$Muri buri koni$q$,NULL,$q$Nyuma ya buri koni$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q219: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni ikihe cyapa muri ibi kintegeka gutanga inzira:$q$,NULL,$q$Icyapa A19$q$,NULL,$q$Icyapa B5$q$,NULL,$q$Icyapa B6$q$,NULL,$q$Ntagisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q220: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura :$q$,NULL,$q$utubuye dutaruka mu muhanda$q$,NULL,$q$umuhanda urimo amazi$q$,NULL,$q$a na b n’ibisubizo$q$,NULL,$q$ntagisubizo kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uri umuyobozi wa velomoteri, uhuye n’umwe munshuti zawe agusaba ko wa mutwara ukamusiga ku’wundi muhanda. ufite imyaka 18 ariko nta ngofero yindi yabigenewe ufite. wamutwara?$q$,NULL,$q$yego$q$,NULL,$q$yego usibye urugendo rurerure$q$,NULL,$q$yego usibye urugendo rugufi$q$,NULL,$q$Oya$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q222: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni ikihe cyapa cy’inyemerera gutambuka mbere mu masangano y’umuhanda?$q$,NULL,$q$Icyapa B3$q$,NULL,$q$Icyapa A22 a$q$,NULL,$q$Icyapa A 20$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mbere yo kunyura kumuyobozi w’ikinyabiziga cy’imitende ibiri, ngomba gucana akaranga cyerekezo k’ibumoso?$q$,NULL,$q$Yego buri gihe$q$,NULL,$q$Yego igihe hari ikinyabiziga kinkurikiye$q$,NULL,$q$Yego iyo nkurikiwe nibindi binyabiziga by’imitende ibiri$q$,NULL,$q$Oya nta na rimwe kunyura kubinyabiziga by’imitende ibiri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Nshobora kunyuraho umuyobozi w’ikinyabiziga wahagaze imbere y’inzira yabanyamaguru?$q$,NULL,$q$yego$q$,NULL,$q$yego nyuma yo kuvuza ihoni$q$,NULL,$q$yego mu gihe nkurikiwe n’ibindi binyabiziga$q$,NULL,$q$Oya$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Hejuru y’aka kanunga:$q$,NULL,$q$Nshobora kunyura ku kinyabiziga icyo aricyose mu gihe nagabanyije umuvuduko$q$,NULL,$q$nshobora kunyura gusa kubinyabiziga by’imitende ibiri$q$,NULL,$q$kunyuranaho ibumoso birabujijwe$q$,NULL,$q$a na b ni ibisubizo by’ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu gihe cy’impanuka mu muhanda n’ubundi bushotoranyi ni yihe nimero ya telefone y’ubutabazi wahamagara :$q$,NULL,$q$911$q$,NULL,$q$100$q$,NULL,$q$112$q$,NULL,$q$131$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ugeze bwa mbere ahabereye impanuka yo mu muhanda harimo inkomere wakora iki ?$q$,NULL,$q$gusohora inkomere mu kinyabiziga$q$,NULL,$q$kubaha icyo kunywa$q$,NULL,$q$ku menyesha impanuka no guhamagara ubutabazi$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mugihe ikinyabiziga cyacu bakinyuzeho$q$,NULL,$q$Tugomba kugabanya umuvuduko$q$,NULL,$q$Tugomba kongera umuvuduko$q$,NULL,$q$Tugomba kongera umuvuduko n’ubwitonzi$q$,NULL,$q$Nta gisubizo cy’ ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ntibyemewe gukoresha telephone$q$,NULL,$q$Mu biro bya leta$q$,NULL,$q$Mu biro bya Polisi$q$,NULL,$q$Igihe utwaye ikinyabiziga$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mbere yo kunyura ku kindi kinyabiziga, ni ngombwa kumenya ko:$q$,NULL,$q$Nta kindi kinyabiziga kinturutse inyuma$q$,NULL,$q$Umuhanda ubona neza, no kwitondera kunyuranaho$q$,NULL,$q$Ikinyabiziga kinturutse imbere gishaka gukatira I buumoso$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ikindi kinyabiziga kiguturutse inyuma kiguterera amatara y’urumuri rumyasa, wakora iki?$q$,NULL,$q$Kongera umuvuduko kugira ngo intera iri hagati yawe n’ukuri inyuma igumeho$q$,NULL,$q$Fata feri y’urugendo kugira ngo umwereke ko ugiye guhagarara$q$,NULL,$q$Emerera icyo kinyabiziga kugutambukaho niba imbere ntacyago gihari$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu gihe Umuntu ufite ubumuga bwo kutabona yambuka umuhanda yitwaje inkoni yera y’abatabona:$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba gufata iyo nkoni nk’icyapa kimumenyesha ko agomba guhagarara$q$,NULL,$q$Vuza ihoni ukomeze$q$,NULL,$q$Gabanya nurangiza ukomeze witonze$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara y’urugendo, mu gihe cy’ibihu:$q$,NULL,$q$Ni meza kuko atuma ureba kure$q$,NULL,$q$Ni mabi kuko arakugarukira akaguhuma amaso$q$,NULL,$q$Akwizeza ko abandi bakubona$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Gutwara uzungazunga mu muhanda:$q$,NULL,$q$Ni bibi ku kinyabiziga cy’imitende ibiri$q$,NULL,$q$Ni bibi igihe cyose$q$,NULL,$q$Ni bibi ku kinyabiziga cy’imitende ine$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Telephone ngendanwa ntigomba gukoreshwa:$q$,NULL,$q$Ahari ibimenyetso bimurika$q$,NULL,$q$Igihe utwaye ikinyabiziga Ku muvuduko wa 20km/h$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$D$q$,$q$igihe cyose$q$,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kunyuranaho bibujijwe gusa igihe:$q$,NULL,$q$Igihe mu muhanda hagati hashushanyijemo umurongo w’umweru ucagaguye.$q$,NULL,$q$Umuhanda ushushanyijwemo umurongo wera udacagaguye$q$,NULL,$q$Ikinyabiziga gitwawe ku musozi unyerera$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu gihe utwaye ikinyabiziga ni joro ucanye amatara maremare ugahura n’ikindi kinyabiziga giturutse mu kindi cyerecyezo:$q$,NULL,$q$Gukomeza ibumoso$q$,NULL,$q$Kuzimya ucana amatara maremare n’amagufi$q$,NULL,$q$Kuzimya amatara maremare kugeza ikindi kinyabiziga gitambutse$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igihe umuyobozi w’inyamaswa, afite inyamaswa idatuje, asaba ko ibinyabiziga bihagarara:$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba guhagarara$q$,NULL,$q$Umuyobozi w’ikinyabizigaagomba kuvuza ihoni agukomeza$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo mu muhanda hashushanyijemo umurongo wera ucagaguye, ntugomba$q$,NULL,$q$Ntugomba kujya mu kindi gice cy’umuhanda$q$,NULL,$q$Ushobora kujya mu kindi gice cy’umuhanda bibaye ngombwa$q$,NULL,$q$Agomba guhagarika ikinyabiziga$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kuvuza ihoni bibujijwe:$q$,NULL,$q$Ku musigiti, ku rusengero, ku rutambiro$q$,NULL,$q$Hafi y’ibitaro$q$,NULL,$q$Hafi y’ubuyobozi bwa polisi$q$,NULL,$q$Nta gisubizo cy’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$.Icyemezo cy’Isuzuma ry’ikinyabiziga kimara igihe kingana iki?$q$,NULL,$q$Amezi 6 kubinyabiziga bikora ubucuruzi$q$,NULL,$q$Amezi 12 ku binyabiziga bidakora ubucuruzi$q$,NULL,$q$Imyaka 2$q$,NULL,$q$A na B ni ibisubizo by’ukuri$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$N’iyihe myifatire myiza wagira ugeze aho abana bari hafi y’inzira nyabagendwa?$q$,NULL,$q$Itonde , witegereze ni biba ngongwa ubaburire unitegura kuba wahagarara.$q$,NULL,$q$Ihute urenge aho abo bana bari$q$,NULL,$q$Komeza ugume ku muvuduko munini$q$,NULL,$q$Komeza ugendere kuruhande rw’iburyo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga yegereye aho umwana w’umuhungu utwaye akagare k’abana asezera ku nshuti ye . N’iyihe myifatire myiza wagira imbere yabo?$q$,NULL,$q$Ikomereze nkaho ataragera munzira nyabagendwa$q$,NULL,$q$Itegure kureka uwo mwana w’umuhungu atambuke, kuko yajya mu muhanda atitaye ku kinyabiziga cyawe$q$,NULL,$q$Gabanya umuvuduko ubwire uwo mwana yambuke ukoresheje ibimenyetso$q$,NULL,$q$Komeza nkaho uwo mwana akiri munzira y’abanyamaguru$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Nk’umuyobozi w’ikinyabiziga, n’iyihe myitwarire wagira?$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba gukomeza$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba kuguma mu ruhande rw’iburyo kugira ngo ahe inzira umumotari$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba gutegereza$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba gutanga inzira ayiha umu motari$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga ageze hafi y’inzira y’abanyamaguru yakwitwara ate?$q$,NULL,$q$Kugabanya umuvuduko mu gihe cyiza, ukitegura guhagarara$q$,NULL,$q$Gukomeza agendera ku muvuduko uri hejuru, mu gihe umunyamaguru ategereje$q$,NULL,$q$Kuguma ku muvuduko yari afite mu gihe umunyamaguru atarambuka$q$,NULL,$q$Kuvuza ihoni akaguma ku muvuduko yahozeho$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga akurikiye ibinyabiziga bibiri, yifuza kubinyuraho. N’iki yashingiraho mbere yo kubanyuraho?$q$,NULL,$q$Ugomba kuzinyuraho zombi$q$,NULL,$q$Sibyiza ko yazinyuraho atabasha kureba neza imbere ye$q$,NULL,$q$Ibyapa by’aho ageze ntibimwemerera kunyuranaho Imbere har’inzira y’abanyamaguru$q$,NULL,NULL,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$N’iki umuyobozi w’ikinyabiziga yakora ashaka gukatira iburyo?$q$,NULL,$q$Vuza ihoni umenyesha umunyegare ko ushaka gukatira iburyo$q$,NULL,$q$Kata ikoni mbere y’umunyegare$q$,NULL,$q$Emerera umunyegare akomeze inzira ye$q$,NULL,$q$Ongera umuvuuko kugira ngo umutange gukata mbere ye$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$N’ayahe matara umuyobozi w’ikinyabiziga agomba gukoresha mugihe cy’ibihu?$q$,NULL,$q$Amatara kamena bihu y’imbere n’ay’inyuma hamwe n’amatara magufi$q$,NULL,$q$Amatara kamenabihu y’imbere n’ay’inyuma$q$,NULL,$q$Amatara magufi$q$,NULL,$q$Urumuri rusanzwe$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Muri ibi binyabiziga n’ikihe gihagaze nabi?$q$,NULL,$q$Ibinyabiziga byombi$q$,NULL,$q$Ikinyabiziga cy’icyatsi$q$,NULL,$q$Ntanimwe$q$,NULL,$q$Ikinyabiziga cy’umutuku$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni gute umuyobozi w’ikinyabiziga yanyura kumunyegare hano?$q$,NULL,$q$Aha umuyobozi w’ikinyabiziga ntashobora kumunyuraho$q$,NULL,$q$Atarenze umurongo wera ucagaguye$q$,NULL,$q$Arenze umurongo wera ucagaguye$q$,NULL,$q$Nta kurenga iyi mirongo yombi$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$N’iki umuyobozi w’ikinyabiziga yakora aramutse ahumishijwe n’urumuri rw’amatara yikinyabiziga giturutse mu kindi cyerekezo?$q$,NULL,$q$humisha ikinyabiziga giturutse mu kindi cyerekezo ucana amatara maremare.$q$,NULL,$q$Egera kunkombe y’iburyo bw’umuhanda nibinashoboka ugabanye umuvuduko.$q$,NULL,$q$Canira amatara ikinyabiziga kiva mukindi cyerekezo$q$,NULL,$q$Ongera umuvuduko kugira ngo usohoke mururwo rumuri vuba bishoboka$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki ugomba gukora igihe wegereye ikimenyetso kimurika kiva mucyatsi kijya mumuhondo?$q$,NULL,$q$Ongera umuvuduko kugirango usoze ikoni$q$,NULL,$q$Komeza kuko itara ry’icyatsi rigiye kwaka.$q$,NULL,$q$Hagarara niba utateza ibyago$q$,NULL,$q$Komeza ubwitonzi witegura guhagarara mugihe itara rihindutse umutuku$q$,NULL,$q$C$q$,NULL,NULL),
  -- Q252: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki umuyobozi w’ ikinyabiziga akwiriye kumenya mugihe akurikiye umuyobozi wikinyamitende ibiri kandi imodoka y’ umweru iri gusubira inyuma ijya mumuhanda?$q$,NULL,$q$Umuyobozi wikinyabiziga gisubira inyuma azahagarara nabona umuyobozi w’ ikinyabimitende ibiri$q$,NULL,$q$Umuyobozi w’ ikinyamitende ibiri ashobora gusaba umuyobozi w’ ikinyabiziga gisubira inyuma guhagarara$q$,NULL,$q$a na b n’ibisubizo by’ukuri$q$,NULL,$q$ntagisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Aha niki umuyobozi w’ ikinyabiziga yakora mugihe ashaka kujya iburyo?$q$,NULL,$q$Gukomeza hagati y’ abanyamaguru babiri$q$,NULL,$q$kuvuza ihoni akongera umuvuduko$q$,NULL,$q$Guhagarara akareka abanyamaguru bakambuka$q$,NULL,$q$Reka umunyamaguru umwe atambuke ubone umwanya wogutambuka$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Aha umuyobozi w’ ikinyabiziga ashobora kunyura kuri aba abanyamagare?$q$,NULL,$q$Oya, umuyobozi ntashobora kureba imbere neza$q$,NULL,$q$Yego, kuko umurongo wera ucagaguye udashobora kuba udacagaguye.$q$,NULL,$q$Yego, abanyamagare bazumva imodoka bave munzira$q$,NULL,$q$Yego, kuko buri kinyabiziga kiva mukindi cyerekezo gishobora kuguha inzira$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Aha niki umuyobozi w’ ikinyabiziga yakora?$q$,NULL,$q$Kwemerera abanyamaguru kwambuka umuhanda$q$,NULL,$q$Kuvuza ihoni agakomeza$q$,NULL,$q$Tengereza munzira y’ abanyamaguru kugeza imidoka izimye$q$,NULL,$q$Kongera umuvuduko mbere yuko abanyamaguru bambuka$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Muri ibi binyabiziga bine ni ikihe kiri mu buryo bwiza bwo gukata ikoni ry’iburyo kiva mu muhanda munini kijya mu muto?$q$,NULL,$q$Ikinyabiziga cya mbere kiri mu buryo bwiza bwo gukata ikoni ry’iburyo$q$,NULL,$q$Ikinyabiziga cya kabiri kiri mu buryo bwiza bwo gukata ikoni ry’iburyo$q$,NULL,$q$Ikinyabiziga cya gatatu kiri mu buryo bwiza bwo gukata ikoni ry’iburyo$q$,NULL,$q$Ikinyabiziga cya kane kiri mu buryo bwiza bwo gukata ikoni ry’iburyo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki umuyobozi w’ikinyabiziga yakora mu gihe abonye icyapa kiburira cya mpande eshatu gitukura mu muhanda?$q$,NULL,$q$Hagarara utegereze amabwiriza$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko ateganya icyago imbere ye$q$,NULL,$q$Kukireka, ukagumana umuvuduko ufite ugakomeza$q$,NULL,$q$Hagarara kuri icyo cyapa cya mpande eshatu mbere yo gukomeza$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki umuyobozi w’ikinyabiziga agomba gukora ahuye n’amatungo mu muhanda?$q$,NULL,$q$Kuvuza ihoni kugirango zihunge$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko zigatambuka$q$,NULL,$q$Kwatsa amatara maremare kugirango utambuke wihuta mu buryo bushoboka bwose$q$,NULL,$q$Kuvuza ihoni ukanyuraho witonze$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki umuyobozi w’ikinyabiziga yakora abonye otobisi iri kuva aho zagenewe guhagararwamo?$q$,NULL,$q$Gukomeza iruhande kuko ufite uburenganzira bwo gukomeza$q$,NULL,$q$Gabanya umuvuduko maze ureke ikomeze$q$,NULL,$q$Gerageza unyureho kugirango atagutinza$q$,NULL,$q$Menyesha umuyobozi wa otobisi aguhe inzira$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki umuyobozi w’ikinyabiziga yakora mugihe ahuye n’ikinyabiziga cyakije itara ry’umuhondo rimyatsa?$q$,NULL,$q$Mu gihe ikinyabiziga giturutse mu kindi cyerekezo kitagishoboye kugenda$q$,NULL,$q$Mu gihe ikinyabiziga ndakumirwa giturutse mu kindi cyerekezo$q$,NULL,$q$Mu gihe ikinyabiziga giturutse mu cyindi cyerekezo cy’ihuta$q$,NULL,$q$Kugabanya umuvuduko witegura guhagarara$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga yakora iki mu gihe anyuzweho nikindi kinyabiziga?$q$,NULL,$q$Gukomezanya umuvuduko warufite$q$,NULL,$q$Kujya i buryo$q$,NULL,$q$Kujya I bumoso$q$,NULL,$q$Kwongera umuvuduko$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q262: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umurongo w’umweru urombereje uciye hagati mu muhanda uvuze iki?$q$,NULL,$q$Umuyobozi wese abujijwe kuwurenga$q$,NULL,$q$Abanyamitende wemerewe kunyuranaho$q$,NULL,$q$Kuhahagara biremewe$q$,NULL,$q$Guhindukira ku manywa$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q263: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga ugeze mu isangano ry’umuhanda ugenzurwa ni ibimenyetso by’amatara yaka agasanga ataka (adakora), yakora iki?$q$,NULL,$q$Guca mu isangano n’ubwitonzi nkaho ntakimenyetso kikuyobora kirimo, witondera abandi bayobozi b’ibinyabiziga$q$,NULL,$q$Gutwara neza ntagutinda mw’isangano$q$,NULL,$q$Guhagarara mw’isangano no guha inzira abayobozi b’ibinyabiziga baturuka iburyo bwawe$q$,NULL,$q$Gucana amatara yose ndanga cyerekezo ugakomeza$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q264: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni iki umuyobozi w’ikinyabiziga yakora ahuye n’ishyo ry’amatungo munzira nyabagendwa?$q$,NULL,$q$Kuvuza ihoni kugirango ayo matungo atambuke$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko no gutambukana ubwitonzi$q$,NULL,$q$Kwatsa amatara maremare n’amagufi no gutambuka vuba bishoboka$q$,NULL,$q$Kuvuza ihoni no gutambukana ubwitonzi$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q265: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga yakora iki igihe ageze ku kazamuko gashinze cyane ?$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko akaguma kuruhande rw’iburyo yirinda ibyago$q$,NULL,$q$Gukandagira ikirenge cya amburiyage no kuvuza ihoni ryo kumunyesha$q$,NULL,$q$Kugumana umuvuduko n’ikirekezo wari ufite mu muhanda$q$,NULL,$q$Guhagarara ku mpera zuwo musozi$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q266: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga yakora iki ahuye n’ikinyabiziga giturutse mukindi kerekezo, gicanye amatara yumuhondo aburira ?$q$,NULL,$q$Umuyobozi w’ikinyabiziga agomba kugabanya umuvuduko no gutambukana ubwitonzi$q$,NULL,$q$Ikinyabiziga cy’ubutabazi$q$,NULL,$q$Yagize ibyago$q$,NULL,$q$Umuvudoko urenze$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q267: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki umuyobozi w’ikinyabiziga yakora ageze hafi y’inzira ifunganye igihe ahuye n’ikindi kinyabiziga giturutse mukindi cyerekezo?$q$,NULL,$q$Agomba kuguma mumwanya yarimo agategereza gutambuka kwikindi kinyabiziga$q$,NULL,$q$kugabanya umuvuduko no gusiga umwanya uhagije hagati y’ibinyabiziga byombi$q$,NULL,$q$gutegereza ko undi muyobozi w’ikinyabiziga ava mu muhanda$q$,NULL,$q$gutwarira ikinyabiziga mu muhanda hagati kugirango abandi bayobozi bahagararare$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q268: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ ikinyabiziga agendera inyuma y’ikindi kinyabizaga akaba adateganya kukinyuraho yakora iki ?$q$,NULL,$q$kuguma yicyo kinyabiziga hagati mu muhanda$q$,NULL,$q$kuguma inyuma yacyo kugirango yemerere ibindi binyabiziga gutambuka$q$,NULL,$q$gutwarira inyuma ye umwegereye cyane kugirango ureke ibindi binyabiziga bibanyureho$q$,NULL,$q$gutanga ibimenyetso kubindi binyabiziga ko byabanyuraho$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q269: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niryari amatara ndanga cyerekezo agomba kugaragazwa kubandi bakoresha umuhanda ?$q$,NULL,$q$igihe gusa ari ngombwa amenyesha ibindi binyabiziga bimukurikiye$q$,NULL,$q$igihe gusa aringombwa kuburira abandi bayobozi bava mukindi cyerekezo$q$,NULL,$q$mugihe gikwiye ushaka kumenyesha abandi bakoresha umuhanda icyo ugiye gukora$q$,NULL,$q$keretse ahari ibimenyetso byo mu muhanda byerekana icyerekezo cyawe$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q270: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Gutinda gutanga ibimenyetso ku muyobozi w’ikinyabiziga ni gute bibangamira abandi bakoresha umuhanda ?$q$,NULL,$q$bigira ingaruka gusa kubaturuka mukindi cyerekezo$q$,NULL,$q$bishobora gutuma batabona igihe gihagije cyo gushyira mubikorwa icyo amenyeshejwe$q$,NULL,$q$baba bafite igihe gihagije cyo gushyira mu bikorwa ibyo bamyeshejwe$q$,NULL,$q$ntacyo bibabangamiraho$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q271: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni ubuhe buryo bwiza bwakurikizwa igihe hari umuntu wakomerekeye mu mpanuka yo mu muhanda ?$q$,NULL,$q$Ku mushyira kunkengero y’umuhanda$q$,NULL,$q$Kutamukuramo keretse mugihe hari ibyago byaterwa n’inkogi y’umuriro cyangwa akaba ashobora kugongwa n’ikindi kinyabiziga no guhamagara ababishinzwe$q$,NULL,$q$Gusaba uwakomeretse kunyeganyeza ibice by’umubiri kugirano umenye aho ibikomere bye bigarukira$q$,NULL,$q$Guhumuriza uwakometse ukamuha ikinyobwo gikonje$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q272: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki umuyobozi w’ikinyabiziga yakora igihe agize uruhare mu mpanuka yo mu muhanda , aho ntawakometese ariko ibinyabiziga bikaba byateza icyago cyangwa byafunze umuhanda ?$q$,NULL,$q$Gushushanya aho zagonganiye no kuzishyira kuruhande$q$,NULL,$q$Gukuramo abagenze ugashyiraho icyapa cya mpandeshatu girukura kumodoka$q$,NULL,$q$Gutegereza ko abapolisi bahagera mbere yo gukura ibinyabiziga mu muhanda$q$,NULL,$q$Guhagarika ibindi binyabiziga kugeza ikibazo gikemutse mukabona kubikura mu muhanda$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q273: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igihe umuyobozi w’ikinyabiziga agendera munzira y’icyerekezo kimwe akifuza gukata ibumoso yakora iki?$q$,NULL,$q$gutwara yegera umurongo wo hagati mu muhanda yerekeza ibumoso$q$,NULL,$q$gutwara yegera uruhande rw’iburyo bw’umuhanda$q$,NULL,$q$gutwara yegera ku uruhande rw’ibumoso bw’umuhanda$q$,NULL,$q$Gutwarira hafi y’umurongo ugabanya umuhanda mo kabili$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q274: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabizaga uri kugendera mu muhanda w’ibyerekezo bibiri nuruhe ruhande rw’umuhanda agomba gukoresha ?$q$,NULL,$q$uruhande rw’ibumoso bw’umuhanda uretse igihe atawaye imashini zihinga cyangwa zikoreshwa indi mirimo$q$,NULL,$q$Mu gice cy;umuhanda yumva ashaka$q$,NULL,$q$Mu gice cy’iburyo bw’umuhanda uretse igihe ashaka kunyuranaho cyangwa gukata ibumoso$q$,NULL,$q$Ku ruhande rw’ibumoso bw’umuhanda$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q275: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igihe umuyobozi w’ikinyabiziga atwaye mu muhanda urombereje w’ibice byinshi agomba kugendera mu kihe gice cy’umuhanda ?$q$,NULL,$q$Kugendera mugice icyo aricyo cyose kirimo ibinyabiziga bike$q$,NULL,$q$Kugendera kugice cy’ibumoso keretse ushaka gusohokera iburyo$q$,NULL,$q$Kugendera mu gice cy’iburyo bw’umuhanda keretse ushaka kunyuranaho$q$,NULL,$q$Ntagutwarira mu ruhande rw’iburyo bw’umuhanda kuko hagenewe imodoka ziremereye n’imodoka nini zitwara abantu.$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q276: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga yakora iki igihe ageze aho banyura bazenguruka?$q$,NULL,$q$Tanga inzira ku binyabiziga byamaze kwinjira aho banyura bazunguruka$q$,NULL,$q$Tanga inzira kubinyabiziga biremereye gusa$q$,NULL,$q$Tanga inzira gusa niba uri munzira ya kabiri niya gatatu isohoka$q$,NULL,$q$Komeza kuko abandi bayobozi b’ibinyabiziga bagomba kuguha inzira yo gukomeza$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q277: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni kihe cyerekezo umuyobozi w’ikinyabiziga yinjiriramo iyo ageze aho banyura bazenguruka ?$q$,NULL,$q$ibumoso$q$,NULL,$q$ibumoso gusa igihe ayobowe ni kimenyetso kimurika$q$,NULL,$q$iburyo cyangwa ibumoso$q$,NULL,$q$iburyo$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q278: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mbere yuko umuyobozi w’ikinyabiziga akata ibumoso mu nzira nyabagendwa, nihe ikinyabiziga kigomba kuba kiri ?$q$,NULL,$q$Mu ruhande rw’iburyo bw’inzira nyabagendwa$q$,NULL,$q$Gusa iburyo bwo hagati y’inzira nyabagendwa$q$,NULL,$q$Muruhande urwarirwo rwo hagati mu nzira nyabagendwa$q$,NULL,$q$Mu ruhande rw’ibumoso bw’inzira nyabagendwa$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q279: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga yakwitondera iki mbere yuko y’injira munzira banyuramo bazengurutse ?$q$,NULL,$q$ibinyabiziga bimuturuka inyuma umuvuduko bifite n’uburyo bimwegereye$q$,NULL,$q$ibinyabiziga biturutse ibumoso bwe n’umuvuduko bifite n’intera iri hagati ye nabyo$q$,NULL,$q$ibinyabiziga biturutse iburyo n’umuvuduko bifite ni intera iri hagati ye nabyo$q$,NULL,$q$ibinyabiziga bimututse imbere , umuvuduko bifite n’intera iri hagati ye nabyo$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q280: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga ugendera inyuma y’ikinyabaziga gitwara abagenzi gihagaze gikuramo cyangwa gishyiramo abagenzi agomba :$q$,NULL,$q$kunyuranaho ibumoso$q$,NULL,$q$gutegereza yihanganye$q$,NULL,$q$a na b ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q281: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igihe ubonye icyapa kigaragaza ishuli wakora iki?$q$,NULL,$q$kugabanya umuvuduko no gukomeza witonze$q$,NULL,$q$gukomeza n’umuvuduko uri hejuru kuko umunyeshuli agomba gutegereza$q$,NULL,$q$kuvuza ihoni$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q282: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umubare w’abagenzi bemewe gutwarwa mukinyabiziga wanditswe mu :$q$,NULL,$q$icyemezo cy’iyandikwa ry’ikinyabiziga$q$,NULL,$q$inyemezabwishyu y’umusoro$q$,NULL,$q$ubwishingizi$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q283: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Gutwara ikinyabiziga wasinze:$q$,NULL,$q$biremewe kubinyabiziga byabikorera kugiti cyabo$q$,NULL,$q$biremewe nijoro$q$,NULL,$q$birabujijwe ku binyabiziga byose bifite moteri$q$,NULL,$q$ibisubizo byose nibyo$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q284: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ugeze ahari inzira yabanyamaguru barindiriye kwambuka. Ntibatangiye kwambuka , wakora iki?$q$,NULL,$q$kuvuza ihoni$q$,NULL,$q$kwihangana ugatagereza$q$,NULL,$q$gukomeza$q$,NULL,$q$nta gisubizo cy’ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q285: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igihe utwaye umuntu mu kinyabiziga cyawe, akibagirwa kwambara umukandara wo kwirinda ibyago ugomba:$q$,NULL,$q$gukuramo umukandara wo kwirinda ibyago wambaye mukawambara mwembi$q$,NULL,$q$kubyerengagiza wizeyeko nta mpanuka muri bukore$q$,NULL,$q$funga cyane umukandara wo kwirinda ibyago wawe$q$,NULL,$q$Kubibutsa kwambara umukandara wo kwirinda ibyago$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q286: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igihe za otobisi zigenewe gutwara banyeshuli zihagaze kugirango zibafate cyangwa bavemo ugomba :$q$,NULL,$q$kuvuza ihoni ugakomeza$q$,NULL,$q$gukomeza ugabanyije umuvuduko n’ubwitonzi kuko bishoboka ko abanyeshuli bakwambuka bitunguranye$q$,NULL,$q$nta bwitonzi budasnzwe bukenewe$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q287: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igihe imodoka iparitse ku nkengero z’umuhanda mugihe cy’ ijoro :$q$,NULL,$q$Imodoka igomba kuba ifunze$q$,NULL,$q$Umuntu ufite uruhushya rwo gutwara ikinyabiziga agomba kuba y1i5c6a.ye mu mwanya w’umuyobozi$q$,NULL,$q$Amatara yo g1u5h7a.garara umwanya munini aguma$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q294: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi w’ikinyabiziga igihe atwaye ikinyabiziga akagira umunaniro utuma y+asinzira yakora iki ? yaka 158. yasinzira yakora iki ?$q$,NULL,NULL,NULL,NULL,NULL,NULL,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q288: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu gihe hari undi muyobozi w’ikinyabiziga ugukurikiye watangiye kukunyuraho :$q$,NULL,$q$Ntugomba kugira undi muyobozi w’ikinyabiziga unyuraho$q$,NULL,$q$Ugomba kunyura ku kindi kinyabiziga$q$,NULL,$q$Ugomba kunyura kukindi kinyabiziga uvugije ihoni$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q289: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Utwaye ikinyabiziga mu muhanda ufite ibyerekezo bibiri .ikinyabiziga imbere yawe cyiragenda buhoro, imbere yawe umuhanda nta kibazo kunyuranaho, ugomba :$q$,NULL,$q$kucyinyuraho bikorewe ibumoso$q$,NULL,$q$kucyinyuraho bikorewe iburyo$q$,NULL,$q$kucyinyuraho ukoresheje uruhande urwo arirwo rwose$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q290: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibice by’umuhanda byera bigari biteganye n’umurongo ugabanya umuhanda mo ,kabiri bisobanura:$q$,NULL,$q$guhagara kw’ikinyabiziga$q$,NULL,$q$aho abanyamaguru bambukira$q$,NULL,$q$guha ubushobozi binyabiziga$q$,NULL,$q$ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q291: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uturebanyuma dukoreshwa:$q$,NULL,$q$kwireba$q$,NULL,$q$kugenzura ibigendera mu muhanda inyuma$q$,NULL,$q$kureba abicaye inyuma$q$,NULL,$q$ntagisubizo cy’ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q292: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kuki abanyamaguru batemerewe kwambuka umuhanda mw’ikoni cyangwa hafi y’imodoka ihagaze?$q$,NULL,$q$ingaruka kubindi binyabiziga$q$,NULL,$q$ingaruka kubandi bakoresha umuhanda$q$,NULL,$q$Abandi bayobozi bi binyabiziga baza bashobora kutabona abambuka umuhanda$q$,NULL,$q$Ibisubizo byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q293: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kunyuranaho mw’ikoni :$q$,NULL,$q$biremewe Gufungura ikirahure cy’ikinyabiziga cyangwa gushyira$q$,NULL,$q$ntibyemewe Guhagarara akaruhuka harimo no kugendagenda niba$q$,NULL,$q$biremewe ukoranye ubwitonzi ubukonje mu modoka kugirango umwuka mwiza winjire mu kinyabiziga bishoboka Kunanura amaboko no gufunga amaso mugihe gito$q$,NULL,$q$Kongera ubushyuhe mu kinyabiziga$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q295: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Niki umuyobozi w’ikinyabiziga yakora igihe atwaye ikinyabiziga mugihe cy’ibihu,imvura nyinshi, umwuzure cyangwa umukungugu mwinshi ?$q$,NULL,$q$Kugendera mu tuyira turi kumpande zu muhanda, ucunga ibimenyetso bigarura urumuri$q$,NULL,$q$Kugabanya umuvuduko hanyuma ugakoresha amatara magufi$q$,NULL,$q$Gucana amatara maremare hanyuma ukagenda gahoro$q$,NULL,$q$Kugendera mu murongo ugabanya umuhanda mo kabiri unareba ibimenyestso by’umuhanda bigarura urumuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q296: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Muri ibi byapa ni ubuhe bwoko bw’ibyapa bitegeka byo mu muhanda?$q$,NULL,$q$ibiri mw’ishusho y’urukiramende n’umuzenguruko w’umuhondo$q$,NULL,$q$ibiri mw’ishusho ya mpande eshatu mu n’uzenguruko mw’ibara ry’ubururu$q$,NULL,$q$ibiri mw’ishusho y’uruziga n’umuzenguruko mw’ibara ry’umutuku$q$,NULL,$q$ibiri mw’ishusho ya mpande enye zingana mubuso bw’umukara$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ugeze mu masangano y’umuhanda aho usanga ibimenyetso bimurika bidakora, wakora iki igihe umukozi ubifiye ububasha aguhaye iki kimenyesto ?$q$,NULL,$q$gukata ibumoso gusa$q$,NULL,$q$gukata iburyo gusa ugakomeza imbere$q$,NULL,$q$Guhagarara kumurongo wo guhagarara umwanya moto$q$,NULL,$q$komeza imbere gusa$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Amatara ndangacyerekezo agomba kugaragara nijoro igihe ijuru rikeye mu ntera nibura ya:$q$,NULL,$q$m 100$q$,NULL,$q$m 200$q$,NULL,$q$m150$q$,NULL,$q$m250$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umurongo ucagaguye uvuga ko buri muyobozi abujijwe kuwurenga uretse mu gihe:$q$,NULL,$q$Agomba kunyura ku kindi kinyabiziga$q$,NULL,$q$Gukatira ibumoso$q$,NULL,$q$Guhindukira cyangwa kujya mukindi gice cy’umuhanda$q$,NULL,$q$Ibi bisubizo byose nibyo$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Igice cy’inzira nyabagendwa kigarukira kumirongo ibiri yera icagaguye ibangikanye kandi gifite ubugari budahagije kugirango imodoka zitambuke neza kiba ari:$q$,NULL,$q$Inzira y’abanyamaguru$q$,NULL,$q$Agahanda k’amagare$q$,NULL,$q$a na b byose ni ukuri$q$,NULL,$q$Nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa kimenyesha kugendera mu muhanda ubisikanirwamo gifite:$q$,NULL,$q$Ishusho y’uruziga mw’ibara ritukura, ubuso bwera n’ikirango cy’umukara$q$,NULL,$q$Ishusho ya mpandeshatu mw’ibara ritukura, ubuso bwera n’ikirango cy’umukara$q$,NULL,$q$Ishusho ya mpandeshatu mw’ibara ritukura, ubuso bw’ubururu n’ikirango cy’umukara$q$,NULL,$q$Ishusho y’uruziga mw’ibara ritukura, ubuso bw’ubururu n’ikirango cy’umukara$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ikinyabiziga kigendeshwa na moteri n’ikinyabiziga gikururwa n’inyamaswa ntibishobora gukurura :$q$,NULL,$q$Ibinyabiziga birenze kimwe$q$,NULL,$q$Ibinyabiziga bipakiye birenze bibiri$q$,NULL,$q$Ibinyabiziga birenze bibiri$q$,NULL,$q$b na c ni byo$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q303: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa kivuga:$q$,NULL,$q$Aho imihanda ihurira$q$,NULL,$q$inkomane y’aho umuhanda umwe urasukira iburyo$q$,NULL,$q$a na b ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$umuhanda ufunganye$q$,NULL),

  -- Q304: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura ibi bikurikira:$q$,NULL,$q$birabujijwe kunyura ku kindi kinyabiziga$q$,NULL,$q$gutambuka mbere kw’ibinyabiziga bituruka aho ujya$q$,NULL,$q$a na b ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cyukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Utugarurarumuri turi ku ruhande rw’imbere rw’ikinyabiziga tugomba gusa:$q$,NULL,$q$n’umuhondo$q$,NULL,$q$n’umutuku$q$,NULL,$q$n’umweru$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q306: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa kivuga:$q$,NULL,$q$iherezo ryo gutambuka mbere$q$,NULL,$q$gutambuka mbere kw’ibinyabiziga biturutse imbere aho ujya$q$,NULL,$q$gutambuka mbere y’ibinyabiziga biturutse imbere$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q307: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa kigizwe:$q$,NULL,$q$ishusho mpandeshatu ,ubuso ubururu$q$,NULL,$q$ishusho mpandeshatu,ubuso umukara$q$,NULL,$q$ishusho mpandeshatu,ubuso umweru$q$,NULL,$q$nta gisubizo cy’ukuri$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q308: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa kivuga:$q$,NULL,$q$ifungana ry’umuhanda iburyo$q$,NULL,$q$ifungana ry’umuhanda w’akayira gasatira umuhanda ibumoso$q$,NULL,$q$akayira gato$q$,NULL,$q$nta gisubizo cy’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi ubonye ko hari undi umukurikiye ashaka kumunyuraho agomba kubahiriza ibi bikurikira :$q$,NULL,$q$kwegera i ruhande rw’iburyo bw’umuhanda$q$,NULL,$q$kongera umuvuduko$q$,NULL,$q$guhagarara$q$,NULL,$q$a na c ni byo bisubizo by’ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q310: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa cyerekana :$q$,NULL,$q$ifungana ry’umuhanda$q$,NULL,$q$ifungana ry’umuhanda n’akayira gasatira umuhanda i bumoso$q$,NULL,$q$umuhanda utaringaniye$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$D$q$,$q$ifungana ry’umuhanda n’akayira gasatira umuhanda i buryo$q$,NULL),

  -- Q311: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyi cyapa gisobanura :$q$,NULL,$q$ntihanyurwa mu byerekezo byombi$q$,NULL,$q$ntihanyurwa n’abandi uretse abahatuye$q$,NULL,$q$hanyurwa mu cyerekezo kimwe gusa$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q312: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa kivuga:$q$,NULL,$q$ikoni iburyo$q$,NULL,$q$akazamuko gashinze cyane$q$,NULL,$q$akamanuko gashobora gutera ibyago$q$,NULL,$q$b na c byose ni ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iyo umuhanda ugabanijemo ibisate bibiri kandi ugendwamo mu byerekezo byombi umuyobozi abujijwe :$q$,NULL,$q$kugendera mu gisate cy’iburyo$q$,NULL,$q$kunyuranaho$q$,NULL,$q$kugendera mu gisate cy’ibumoso$q$,NULL,$q$ibisubizo byose ni byo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cyerekana inzira y’amatungo itegetswe giteye:$q$,NULL,$q$Uruziga mubuso bw’ubururu, ishusho y’inka mu ibara ry’umukara$q$,NULL,$q$Uruziga mu ibara ryera, ishusho y’inka mwibara ry’ubururu$q$,NULL,$q$Uruziga mu buso bw’ibara ry’ubururu, ishusho y’inka mu ibara ryera n’ikirango cy’umukara$q$,NULL,$q$Uruziga mu buso bw’ibara ry’ubururu, ishusho y’inka mu ibara ryera$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa cyerekana ko bibujijwe kuvuza amahoni kirangwa na :$q$,NULL,$q$ishusho y’uruziga, ubuso bw’ubururu, ikiranga cy’umukara$q$,NULL,$q$ishusho y’uruziga, ubuso bw’ubururu, ikiranga cy’umweru$q$,NULL,$q$ishusho y’uruziga, ubuso bw’umweru, ikiranga cy’umukara$q$,NULL,$q$ntagisubizi cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibyapa biburira nibyo gutambuka mbere birangwa:$q$,NULL,$q$.ishusho mpandeshatu mw’ibara ritukura , ubuso bwera n’ ikiranga mu ibara ry’umukara$q$,NULL,$q$ishusho mpandeshatu mw’ibara ritukura,ubuso bw’ubururu n’ikiranga mu ibara ry’umukara$q$,NULL,$q$ishusho y’uruziga mw’ibara ritukura,ubuso bw’ubururu n’ikiranga mu ibara ry’umukara$q$,NULL,$q$ishusho y’uruziga mw’ibara ritukura,ubuso bwera n’ikiranga mu ibara ry’umukara$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibyapa biburira bibereyeho kumenyesha umugenzi :$q$,NULL,$q$ko hari icyago$q$,NULL,$q$icyago kidasobanuye ukundi$q$,NULL,$q$imiterere y’icyago gitunguranye$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibyapa by’inyongera bishobora kumenyesha.$q$,NULL,$q$ibitegetswe byihariye gusa$q$,NULL,$q$ubugerure cyangwa amarengamategeko rusange cyangwa ibibujijwe ndetse n’ibitegetswe byihariye$q$,NULL,$q$a na b ni ibisubizo by’ukuri$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ishusho y’icyapa kivuga’’ugukikira”bitegetswe ni :$q$,NULL,$q$mpandeshatu$q$,NULL,$q$uruziga$q$,NULL,$q$urukiramende$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Icyapa kivuga “icyerekezo gitegetswe”kigizwe n’ikirango cy’ibara :$q$,NULL,$q$umweru$q$,NULL,$q$umutuku$q$,NULL,$q$ubururu n’ikirango cy’umweru$q$,NULL,$q$umukara$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q322: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki kimenyetso gitanzwe n’umukozi ubifitiye ububasha cyo guhagarara :$q$,NULL,$q$ku bakoresha umuhanda ba muturutse imbere$q$,NULL,$q$ku bakoresha umuhanda bose bamuturutse imbere n’inyuma$q$,NULL,$q$kubakoresha umuhanda bose bamuturutse inyuma$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),
  -- Q323: no correct-answer marker found
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ibi byapa byo mu muhanda birambuza kunyuranaho ibumoso ?$q$,NULL,$q$yego$q$,NULL,$q$yego, iyo ufite umuvuduo wa 90km/h$q$,NULL,$q$oya$q$,NULL,$q$ntagisubizo cy’ukuri$q$,NULL,$q$A$q$,NULL,NULL),
  -- Q324: multiple marked options (a,b,c,d)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuhanda urombereje w’ibice byinshi. Ndashaka kunyura kuri izi kamyo ibyiri mugihe gito ibumoso icyarimwe , biremewe ?$q$,NULL,$q$yego,$q$,NULL,$q$oya$q$,NULL,$q$yego bikorewe ibumoso$q$,NULL,$q$ntagisubizo kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q325: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$K’umuyobozi w’ivatiri, iki cyapa kivuze iki ?$q$,NULL,$q$kirambuza gutwara ku muvuduko utarengeje 5km/h$q$,NULL,$q$ntaburenganzira kimpa, mugihe gikurikizwa ku binyabiziga bifite hejuru y atoni 5$q$,NULL,$q$ntacyo bindebaho mugihe bireba gusa zipima tone 5 no kurengaho.$q$,NULL,$q$Ntagisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ndashaka gukata iburyo. Biremewe ?$q$,NULL,$q$yego$q$,NULL,$q$yego, ariko nyuma yo guhagarara$q$,NULL,$q$ntabwo byemewe$q$,NULL,$q$ntagisubizo cyukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuhanda wambukiranya inzira ya gariyamoshi$q$,NULL,$q$nshobora gukomeza nkambuka umuhanda kubera ko uruzitiro rufunguye$q$,NULL,$q$ngomba guhagarara munsi yitara ry’umutuku rimyatsa$q$,NULL,$q$ntabwo nakomeza urugendo rwanjye. Ngomba gihita mpagarara$q$,NULL,$q$ntagisubizo cy’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q328: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Kuri iki cyapa cyo mu muhanda cyambere kintegeka ?$q$,NULL,$q$Kugendera k’umuvuduko uri hejuru ya 30km/h$q$,NULL,$q$kutarenza umuvuduko wa 30km/h$q$,NULL,$q$birabujijwe kugendera kumuvuduko uri hejuru ya 30km/h$q$,NULL,$q$nta gisubizo cyukuri$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mpagaze mu murongo wo guhagarara umwanya muto$q$,NULL,$q$Nshobora gukata iburyo$q$,NULL,$q$Nshobora gukata ibumoso$q$,NULL,$q$Nshobora gukata ibumoso cyangwa iburyo$q$,NULL,$q$Ntagisubizo kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ngomba :$q$,NULL,$q$guhagarara igihe gito kuri icyi cyapa cy’umuhanda$q$,NULL,$q$guhagarara ngatanga inzira kuri metero 100 ntaragera kuri icyi cyapa$q$,NULL,$q$gutanga inzira nkanahagarara iyo ari ngombwa muri m100 ntaragera kuri icyi cyapa$q$,NULL,$q$ntagisubizo cy’ukuri$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ndashaka kugata ibumoso. Imodoka y’icyatsi yaje irahagarara. Ninde ufite uburenganzira bwo gutambuka mbere?$q$,NULL,$q$mfite uburenganzira bwo gutambuka mbere$q$,NULL,$q$imodoka y’icyatsi ifite uburenganzira bwo gutambuka mbere$q$,NULL,$q$twembi ntaburenganzira bwo gutambuka mbere gusa tugomba gutambukana ubwitonzi$q$,NULL,$q$ntagisubizo nakimwe kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mfite uburenganzira bwo gutambuka muri iri sangano ?$q$,NULL,$q$yego, niba ukata ibumoso$q$,NULL,$q$Oya niba ukata iburyo$q$,NULL,$q$yego , bitewe noho ngana$q$,NULL,$q$ntagisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ndi kumuvuduko wa 20km/h. nshobora gukomeza muri iri sangano ry’umuhanda?$q$,NULL,$q$oya$q$,NULL,$q$yago, nshobora gukata iburyo$q$,NULL,$q$yego, nshobora guta ibumoso cyangwa iburyo$q$,NULL,$q$yego, nshobora gukata ibumoso gusa$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Umuyobozi wikinyabiziga aritegura kunyuraho ibumoso :$q$,NULL,$q$nshobora kumunyuraho nyuze iburyo$q$,NULL,$q$sinshobora kumunyura$q$,NULL,$q$nshobora kumunyura nciye ibumoso ariko mbonye ko mfite umwanya uhagije$q$,NULL,$q$Ntagisubizo cy’ukuri kirimo$q$,NULL,$q$C$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Uhereye kuri ibi byapa habujijwe :$q$,NULL,$q$Kunyuranaho kubinyabiziga birengeje imitende ibiri ibumoso no kugendera kumuvuduko urengeje 70 km/h$q$,NULL,$q$Kunyuranaho kubinyabiziga bikururwa cyangwa ibinyabiziga birengeje imitende ibiri ibumoso$q$,NULL,$q$kugendera hejuru ya 70 km/h$q$,NULL,$q$ntagisubizo cy’ukuri$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ndashaka gupariki ikinyabiga iburyo kunzira y’abanyamaguru$q$,NULL,$q$biremewe munsi yicyi cyapa$q$,NULL,$q$biremewe imbere y’icyi cyapa$q$,NULL,$q$birabujijwe imbere n’inyuma yicyi cyapa$q$,NULL,$q$nta gisubizo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q337: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Guhagarara, aho abanyeshuri bambukira$q$,NULL,$q$Hagarara akanya gato$q$,NULL,$q$Ibindi binyabiziga bigomba kuguha inzira$q$,NULL,$q$Gutanga umwanya ku bindi binyabiziga i buryo bwawe$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q338: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki mu nkomane ?$q$,NULL,$q$Tanga inzira ku binyabiziga binini$q$,NULL,$q$Gabanya umuvuduko uhe inzira abanyamaguru.$q$,NULL,$q$Tanga inzira ku binyabiziga bigenda mu muhanda munini wegera$q$,NULL,$q$Tanga inzira ku ibinyabiziga biturutse iburyo bwawe$q$,NULL,$q$C$q$,NULL,NULL),
  -- Q339: multiple marked options (b,a)
  -- Q339: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki aho banyura bazengurutse ?$q$,NULL,$q$Tanga inzira ku binyabiziga biri mu muhanda munini Komeza imbere gusa$q$,NULL,$q$Tanga inzira ku binyabiziga biturutse i bumoso Aho kunyuranaho imbere$q$,NULL,$q$Tanga inzira ku ma kamyo na za otobisi Aho guhagarara umwanya munini$q$,NULL,$q$Ibinyabiziga byose uretse amapikipiki bigomba gutanga inzira 340 . Iki cyapa gisobanura iki ? Inzira y’ icyerekezo kimwe$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q341: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Umuhanda urombereje w’ibice byinshi ibumoso$q$,NULL,$q$Umuhanda uyoborejwe i bumoso$q$,NULL,$q$Ibinyabiziga biturutse iburyo bifite uburenganzira bwo gutambuka mbere$q$,NULL,$q$Kata i bumoso gusa$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q342: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Kunyuranaho bikorerwa i buryo gusa$q$,NULL,$q$Umuhanda uyoborejwe i buryo$q$,NULL,$q$Kata i buryo gusa$q$,NULL,$q$Umuhanda munini urasukira i bumoso$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q343: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Birabujijwe gukata i buryo$q$,NULL,$q$Tanga inzira ku bindi binyabiziga bigenda mu gihe ugiye gukatira iburyo$q$,NULL,$q$Kata i buryo mu gihe nta bindi binyabiziga biturutse mu kindi cyerekezo$q$,NULL,$q$Nta nkengero y’umuhanda yegutse iri i buryo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q344: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Ntihasohokerwa i bumoso mu nzira banyuramo bazengurutse$q$,NULL,$q$Umuhanda udakomeza ibumoso$q$,NULL,$q$Nta nkengero y’umuhanda yegutse iri ibumoso$q$,NULL,$q$Birabujijwe gukata ibumoso$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q345: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Birabujijwe guhindukira$q$,NULL,$q$Birabijijwe gusubira inyuma$q$,NULL,$q$Umuhanda unyerera imbere$q$,NULL,$q$Ntibyemewe kugendera mu byerekezo byombi$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q346: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Umuhanda urombereje w’ibice byinshi ku birometero 50$q$,NULL,$q$Intera nto ntarengwa ya metero 50 hagati y’ibinyabiziga$q$,NULL,$q$Umuvuduko urenga ibirometero 50 mu isaha$q$,NULL,$q$Umuvuduko ntarengwa ugarukira ku birometero 50 mu isaha$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q347: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Birabujijwe ku binyabiziga bitwara abakozi ba leta$q$,NULL,$q$Birabujijwe guhagara umwanya munini$q$,NULL,$q$Birabujijwe ku binyabiziga by’abikorera ki giti cyabo$q$,NULL,$q$Parikingi$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q348: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Aho guhagararwamo n’abanyamagare imbere$q$,NULL,$q$Aho abana bagenewe kwiga gutwara amagare$q$,NULL,$q$Inzira y’iminyamitende n’abanyamaguru itegetswe$q$,NULL,$q$Abanyamagare bagomba kuva ku igare bakagendesha amaguru$q$,NULL,$q$C$q$,NULL,NULL),

  -- Q349: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Uburemere ntarengwa bwemewe bwa toni 3$q$,NULL,$q$Ntihanyurwa n’ibinyabiziga bigenewe gutwara ibicuruzwa$q$,NULL,$q$Ntihanyurwa n’ibinyabiziga bifite imitambiko itatu$q$,NULL,$q$Hanyurwa n’ibinyabiziga bifite imitambiko itatu gusa$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q350: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Inkomane banyuramo bazengurutse$q$,NULL,$q$Biremewe guhindukira$q$,NULL,$q$Inzira y’icyerekezo kimwe imbere$q$,NULL,$q$Birabujijwe guhindukira$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q351: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Umuhanda ugabanijwemo ibisate bibiri$q$,NULL,$q$Umuhanda ugabanijwemo ibisate bine$q$,NULL,$q$Inzira y’icyerekezo kimwe$q$,NULL,$q$Ukugendera mu muhanda ubisikanirwamo$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q352: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Umuhanda utaringaniye i buryo$q$,NULL,$q$Akamanuko gashobora gutera ibyago$q$,NULL,$q$Ahantu umuhanda umeze nabi$q$,NULL,$q$Uguhinguka ku mwaro cyangwa ku nkombe$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q353: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Akazamuko gashinze cyane$q$,NULL,$q$Umuhanda utaringaniye i bumoso$q$,NULL,$q$Ahantu umuhanda umeze nabi$q$,NULL,$q$Ahegereye utununga$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q354: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Akazamuko gashinze cyane$q$,NULL,$q$Umuyaga w’intambike$q$,NULL,$q$Uruhererekane rw’amakoni$q$,NULL,$q$Umuhanda unyerera$q$,NULL,$q$D$q$,NULL,NULL),

  -- Q355: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Abana$q$,NULL,$q$Inzira y’abanyamaguru – Itegure guhagarara$q$,NULL,$q$Ikibuga cy’imikino cy’abana$q$,NULL,$q$Ikibuga cy’ imyidagaduro$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q356: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Isoko ry’amatungo$q$,NULL,$q$Ivuriro ry’amatungo$q$,NULL,$q$Uruzitiro rw’amatungo$q$,NULL,$q$Akayira k’amatungo$q$,NULL,$q$D$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Mu byapa bikurikira , ni ikihe cyerekana umuhanda udakomeza:$q$,NULL,$q$Icyapa C1$q$,NULL,$q$Icyapa E14$q$,NULL,$q$Icyapa C2a$q$,NULL,$q$Icyapa B2a$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q358: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Tanga inzira$q$,NULL,$q$Icyago$q$,NULL,$q$Icyerekezo kimwe$q$,NULL,$q$Ntihanyurwa$q$,NULL,$q$A$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Muri ibi byapa bikurikira ni ikihe cyerekana ko umuyobozi ukibonye yemerewe gutambuka mbere y'abaturutse aho agana mu nzira ifunganye:$q$,NULL,$q$Icyapa B6$q$,NULL,$q$Icyapa A19$q$,NULL,$q$Icyapa B3$q$,NULL,$q$Icyapa A22a$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q360: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa:$q$,NULL,$q$Aho banyura bazengurutse$q$,NULL,$q$Cyerekana umuhanda w'ibisate bitatu$q$,NULL,$q$Cyerekana ahegereye inkomane$q$,NULL,$q$Ntagisuzo cy’ukuri kirimo$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q361: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Hanyurwa mu cyerekezo kimwe$q$,NULL,$q$Ntihanyurwa$q$,NULL,$q$Umuhanda udakomeza$q$,NULL,$q$Ntagisuzo cy’ukuri kirimo$q$,NULL,$q$B$q$,NULL,NULL),

  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Ni ikihe icyapa gisobanura umuhanda w'icyerekezo kimwe:$q$,NULL,$q$Icyapa D1a$q$,NULL,$q$Icyapa E13a$q$,NULL,$q$Icyapa C19$q$,NULL,$q$Icyapa C1$q$,NULL,$q$B$q$,NULL,NULL),

  -- Q363: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki cyapa gisobanura iki ?$q$,NULL,$q$Iherezo ry’ umuhanda urombeje w’ibice byinshi$q$,NULL,$q$Birabujijwe kunyura mu mu muhanda w’ ikindi cyerekezo$q$,NULL,$q$Birabujijwe kunyuranaho$q$,NULL,$q$Birabujijwe guhagara ku iteme$q$,NULL,$q$A$q$,NULL,NULL),

  -- Q364: picture/sign question (image URLs left NULL)
  ($q$bcb8c5b1-b4ec-4117-b05f-5a6aec6eaa9e$q$,$q$Iki kimenyetso kiri mu muhanda kivuze iki ?$q$,NULL,$q$Biremewe kunyuranaho$q$,NULL,$q$Umuyobozi abujijwe kukirenga$q$,NULL,$q$Wegereye icyapa cyo guhagarara umwanya muto$q$,NULL,$q$Umuhanda ufunganye$q$,NULL,$q$B$q$,NULL,NULL);

COMMIT;
