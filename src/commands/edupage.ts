import { Command } from "@sapphire/framework";
import {
	ForumChannel,
	SlashCommandBooleanOption,
	SlashCommandStringOption,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import { Edupage } from "edupage-api";
import { client } from "../index";
import fs from "fs";
import download from "download"
import { htmlToText } from 'html-to-text';

export class EduCommand extends Command {
	private edupage = new Edupage();

	private database = client.database;
	public constructor(
		context: Command.LoaderContext,
		options: Command.Options,
	) {
		super(context, {
			...options,
			name: "edu",
			description: "Edupage releated utils",
			requiredClientPermissions: [
				"AttachFiles",
				"CreateEvents",
				"CreatePublicThreads",
				"ManageChannels",
				"ManageMessages",
				"SendMessagesInThreads",
				"SendMessages",
			],
			requiredUserPermissions: [
				"AttachFiles",
				"CreateEvents",
				"CreatePublicThreads",
				"ManageChannels",
				"ManageMessages",
				"SendMessagesInThreads",
				"SendMessages",
			],
			enabled: true,
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder
					.setName("edu")
					.setDescription("Edupage releated utils")
					.addBooleanOption((option: SlashCommandBooleanOption) =>
						option
							.setName("show-teachers")
							.setDescription("Shows all current teachers")
							.setRequired(false),
					)
					.addStringOption((option: SlashCommandStringOption) =>
						option
							.setName("remove")
							.setDescription("Remove homework using superID")
							.setAutocomplete(true)
							.setRequired(false),
					),
			/*{ guildIds: ["1015277694415548467"] },*/
		);
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		await interaction.deferReply({ ephemeral: true });
		await this.edupage.login(
			process.env.edupage_username,
			process.env.edupage_password,
		);

		if (interaction.options.getBoolean("show-teachers")) {
			const data = await this.getTeachers(this.edupage);
			const formattedData = data
				.map(
					(item) =>
						`${item.firstName} ${item.lastName} (${item.shortName}) - ID: ${item.id}`,
				)
				.join("\n");

			const chunks = this.chunkString(formattedData, 2000);

			await interaction.editReply("Here's the data:");

			for (const chunk of chunks) {
				await interaction.followUp(chunk);
			}
			return;
		}

		if (interaction.options.getString("remove")) {
			this.database.run("DELETE FROM homeworkExists WHERE superID = ?", [
				interaction.options.getString("remove"),
			]);
			return await interaction.reply({ content: "Homework Removed" });
		}

		const mainChannels = {
			APM: "1278300352969703434",
			SJL: "1278300314197561388",
			PCI: "1278300413480796242",
			API: "1278306233065148469",
			RUJ: "1278300487493484606",
			GRS: "1278300433026387969",
			WBN: "1278300549745213450",
			OKD: "1278300596306186342",
			ANJ: "1278300460658458624",
			OBN: "1278300656393785345",
			AFY: "1278300523279290471",
			PRO: "1278300627017011302",
			POG: "1310691740008579152",
		};

		const devChannels = {
			APM: "1376621116256288839",
			SJL: "1376621116256288839",
			PCI: "1376621116256288839",
			API: "1376621116256288839",
			RUJ: "1376621116256288839",
			GRS: "1376621116256288839",
			WBN: "1376621116256288839",
			OKD: "1376621116256288839",
			ANJ: "1376621116256288839",
			OBN: "1376621116256288839",
			AFY: "1376621116256288839",
			PRO: "1376621116256288839",
			POG: "1376621116256288839",
		};

		const startTime = Date.now()
		const channels = client.mode == "dev" ? devChannels : mainChannels;
		const homework = (
			await Promise.all(
				this.edupage.assignments.map(async (work: Assignment) => {
					this.container.logger.info(
						`Starting processing: ${work.title} (${work.id})`,
					);
					if (await this.database.get(`SELECT superID FROM homeworkExists WHERE superID = ${work.superId}`)) {
						this.container.logger.info(`Already exists skipping: ${work.title} (${work.id})`)
						return null
					}

					return {
						id: work.id,
						superId: work.superId,
						owner: {
							id: work.owner.id,
							name: `${work.owner.firstname} ${work.owner.lastname}`,
							userString: work.owner.userString,
						},
						subject: {
							id: work.subject.id,
							name: work.subject.name,
							shortName: work.subject.short,
						},
						title: work.title,
						testId: work.testId,
						type: work.type,
					};
				}),
			)
		).filter((hw) => hw != null);
		if (homework.length == 0) {
			return interaction.editReply({ content: "No homework found" });
		}

		for (const work of homework) {
			const forumId = channels[work.subject.shortName];
			if (!forumId) {
				this.container.logger.error(
					`No forum found for subject: ${work.subject.shortName}`,
				);
				continue;
			}

			const guild = await client.guilds.fetch(
				client.mode == "dev"
					? "1015277694415548467"
					: "704765614627094589",
			);
			if (!guild) {
				this.container.logger.error(`No guild found`);
				continue;
			}

			const forum: ForumChannel = (await guild.channels.cache.get(
				forumId,
			)) as ForumChannel;
			if (!forum) {
				this.container.logger.error(`No forum found`);
				continue;
			}

			if (work.testId == undefined) {
				const title =
					work.title.length > 100
						? work.title.substring(0, 99)
						: work.title;
				let msg = `
				\`\`\`
{
    "SuperID": "${work.superId}",
    "Autor": "${work.owner.name}",
    "Subject": "${work.subject.name}",
	"Title": "${work.title}",
	"Type": "${work.type}"
}
\`\`\`
				`;
				const noIdForum = await forum.threads.create({
					name: title,
					message: { content: msg },
				});

				this.database.run("INSERT INTO homeworkExists (superID, title, forumChannelID, forumID) VALUES (?, ?, ?, ?)", [work.superId, work.title, noIdForum.id, forum.id])
				continue;
			}

			const materialData: TestData = await this.getMaterial(
				this.edupage,
				work,
			);

			if (!materialData) {
				this.container.logger.warn(`No materialData... continuing`);
				continue;
			}

			const title =
				work.title.length > 100
					? work.title.substring(0, 99)
					: work.title;
			let msg = `
\`\`\`json
{
    "Id": "${materialData.testid}",
    "SuperId": "${work.superId}",
    "Autor": "${work.owner.name}",
    "Title": "${work.title}",
    "CardIds": [${materialData.cardids.map((id) => `"${id}"`).join(", ")}],
    "Type": "${work.type}",
    "Time": "${materialData.timestamp.split(" ")[0]}"
}\`\`\``;

			this.container.logger.info(`Creating forum Thread for ${work.title}`)
			const forumChan: ThreadChannel = await forum.threads
				.create({
					name: title,
					message: { content: msg },
				})
				.catch((err) => {
					this.container.logger.error(`Error creating forum: ${err}`);
					return null;
				});

			const messageChannel = guild.channels.cache.get(
				forumChan.id,
			) as TextChannel;
			const text: string[] = [];
			const files: { src: string; name: string }[] = [];
			const videos: string[] = [];
			const images: { src: string; name: string }[] = []


			for (const id of materialData.cardids) {
				const data = await materialData.cardsData[id];
				if (!data) {
					this.container.logger.info(`No data for id: ${id}`);
					continue;
				}

				const homeworkData: QuestionETestWidget = await JSON.parse(
					data.content,
				);
				for (const widget of homeworkData.widgets) {
					//VideoETestWidget TextETestWidget FileETestWidget ElaborationETestWidget
					fs.appendFileSync("./widget.json", JSON.stringify(widget));
					if (widget.widgetClass == "VideoETestWidget") {
						videos.push(
							this.stripHtmlTags(widget.props.source.src),
						);
						if (widget?.props?.files) {
							widget.props.files.map((obj) => {
								files.push({
									src: obj.src,
									name: obj.name,
								});
							});
						}
					}

					if (widget.widgetClass == "ElaborationETestWidget") {
						if (widget?.props?.files) {
							widget.props.files.map((obj) => {
								files.push({
									src: obj.src,
									name: obj.name,
								});
							});
						}
					}

					if (widget.widgetClass == "FileETestWidget") {
						files.push(
							...widget.props.files.map((file) => {
								return {
									src: file.src,
									name: `${Math.random()}file_${file.name}`
								};
							}),
						);
					}

					if (widget.widgetClass == "ImageETestWidget") {
						images.push(
							...widget.props.src.map(img => {
								return {
									src: img.src,
									name: `${Math.random()}img_${img.name}`
								}
							})	
						)
					}

					if (widget.widgetClass == "OrderingAnswerETestWidget") {
						// TODO
					}

					if (widget.widgetClass == "TitleETestWidget") {
						// TODO
					}



					if (widget.widgetClass == "TextETestWidget") {
						const htmlText = this.stripHtmlTags(
							widget.props.htmlText,
						);
						const strippedParsedText = this.stripHtmlTags(
							widget.props._parsedHtmlText,
						);

						if (widget?.props?.files) {
							widget.props.files.map((obj) => {
								files.push({
									src: obj.src,
									name: obj.name,
								});
							});
						}

						if (htmlText != undefined && htmlText.trim() !== "") {
							text.push(htmlText);
						}

						if (
							strippedParsedText != undefined &&
							strippedParsedText.trim() !== ""
						) {
							text.push(strippedParsedText);
						}
					}
				}

				
			}
			for (const str of this.removeDuplicateYouTubeLinks([...text, ...videos])) {
				if (str.length === 0) continue;

				
				await messageChannel.send({ content: htmlToText(str, {wordwrap: false}) }).catch(err => {
					console.error(err);
					return
				});
			}
			
			for (const file of files) {				
				const fileUrl = "https://sps-snina.edupage.org" + file.src;
				await download(fileUrl, './', { filename: file.name });
				await messageChannel.send({ files: [{ attachment: `./${file.name}` }] }).then(() => {
					fs.unlinkSync(`./${file.name}`);
				}).catch(err => {
					console.error(err);
					return
				});

			}

			for (const img of images) {
				const fileUrl = "https://sps-snina.edupage.org" + img.src;
				await download(fileUrl, './', { filename: img.name });
				await messageChannel.send({ files: [{ attachment: `./${img.name}` }] }).then(() => {
					fs.unlinkSync(`./${img.name}`);
				}).catch(err => {
					console.error(err);
					return
				});
			}

			this.database.run("INSERT INTO homeworkExists (superID, title, forumChannelID, forumID) VALUES (?, ?, ?, ?)", [work.superId, work.title, forumChan.id, forum.id])
		}
		const endTime = Date.now();
		
		interaction.editReply(`Processing completed [${endTime - startTime}ms].`);
		this.container.logger.info(`Processing assignments took: ${endTime - startTime}ms`);
        this.edupage.exit();

	}
	public async messageRun(message) {}

	private chunkString(str: string, length: number): string[] {
		const chunks = [];
		let i = 0;
		while (i < str.length) {
			chunks.push(str.slice(i, i + length));
			i += length;
		}
		return chunks;
	}

	private getTeachers(edupage) {
		return edupage.teachers.map((teacher) => {
			return {
				firstName: teacher.firstname,
				lastName: teacher.lastname,
				shortName: teacher.short,
				id: teacher.id,
			};
		});
	}

	private async getMaterial(edupage, homework) {
		const assignment = edupage.assignments.find((assig: Assignment) =>
			assig.title.startsWith(homework.title),
		);

		if (!assignment) {
			this.container.logger.info(
				`Assignment not found for homework: ${homework.title}`,
			);
			return;
		}

		const material = await assignment.getData().catch(async (err) => {
			this.container.logger.error(`Error while getting Material: ${err}`);
			return;
		});

		if (!material?.materialData) {
			this.container.logger.info(
				`Material data not found for homework: ${homework.title}`,
			);
			return null;
		}
		return material.materialData;
	}

	private stripHtmlTags(text: String): string {
		if (!text) return "";
		return text.toString().replace(/<[^>]*>/g, "");
	}

	private removeDuplicateYouTubeLinks(links: string[]): string[] {
		const videoIdsSet = new Set<string>();
		const uniqueLinks: string[] = [];

		// Iterate over the array and extract video IDs
		links.forEach((link) => {
			const videoId = this.extractVideoId(link);
			if (videoId && !videoIdsSet.has(videoId)) {
				videoIdsSet.add(videoId);
				uniqueLinks.push(link);
			} else if (!videoId) {
				// If it's not a YouTube link, keep it as is
				uniqueLinks.push(link);
			}
		});

		return uniqueLinks;
	}

	private extractVideoId(link: string): string | null {
		const regex =
			/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
		const match = link.match(regex);
		return match ? match[1] : null;
	}
}

interface Edupage {
	user: Student[];
	seasons: any[]; // Replace 'any' with the appropriate type
	students: Student[];
	teachers: Teacher[];
	classes: Class[];
	classrooms: Classroom[];
	parents: Parent[];
	subjects: Subject[];
	periods: Period[];
	timetables: any[]; // Replace 'any' with the appropriate type
	timelineItems: any[]; // Replace 'any' with the appropriate type
	timeline: any[]; // Replace 'any' with the appropriate type
	plans: Plan[];
	assignments: Assignment[];
	homeworks: Homework[];
	tests: Test[];
	applications: Application[];
	ASC: ASC;
	year: number;
	baseUrl: string;
	grades: any[]; // Replace 'any' with the appropriate type
}

interface TestData {
	testid: string;
	userid: string;
	author: string;
	timestamp: string;
	name: string;
	short: string | null;
	description: string | null;
	keywords: string | null;
	options: {
		variants: any[][];
		gvariants: any[][];
		screenProps: { cardsPerScreen: string };
		studyCompetences: any[];
		standards: any[];
		variantsChanged: string;
	};
	cardids: string[];
	etestType: string;
	copyof: string | null;
	school_card: string | null;
	co_som: string;
	editable: boolean;
	cardsData: {
		[key: string]: {
			cardid: string;
			userid: string;
			author: string;
			keywords: string;
			competences: string | null;
			subjectid: string | null;
			content: string;
			timestamp: string;
			stav: string;
			copyof: string | null;
			school_card: string | null;
			visibility: string;
			has_question: string;
			moredata: string | null;
			copyof_diff: string | null;
			histid: string;
			groupid: string | null;
			license: string | null;
			editable: boolean;
		};
	};
}

interface Student {
	edupage: Edupage;
	dateFrom: Date;
	dateTo: Date | null;
	firstname: string;
	lastname: string;
	gender: "M" | "F";
	id: string;
	userString: string;
	isOut: boolean;
	origin: string;
	credentials: any; // Replace 'any' with the appropriate type
	cookies: any; // Replace 'any' with the appropriate type
	isLoggedIn: boolean;
	email: string | null;
	number: number;
	numberInClass: number;
	parent1Id: string;
	parent2Id: string;
	parent3Id: string;
	parent1: Parent | undefined;
	parent2: Parent | undefined;
	parent3: Parent | null;
	class: Class;
}
interface Teacher {
	edupage: Edupage;
	dateFrom: Date;
	dateTo: Date | null;
	firstname: string;
	lastname: string;
	gender: "M" | "F";
	id: string;
	userString: string;
	isOut: boolean;
	origin: string;
	credentials: any; // Replace 'any' with the appropriate type
	cookies: any; // Replace 'any' with the appropriate type
	isLoggedIn: boolean;
	email: string | null;
	cb_hidden: number;
	short: string;
	classroom: Classroom | undefined;
}

interface Parent {
	edupage: Edupage;
	dateFrom: Date | null;
	dateTo: Date | null;
	firstname: string;
	lastname: string;
	gender: "M" | "F";
	id: string;
	userString: string;
	isOut?: boolean;
	origin: string;
	credentials: any; // Replace 'any' with the appropriate type
	cookies: any; // Replace 'any' with the appropriate type
	isLoggedIn: boolean;
	email: string | null;
}

interface Period {
	id: string;
	name: string;
	short: string;
	startTime: string;
	endTime: string;
}

interface Subject {
	id: string;
	name: string;
	short: string;
}
interface Classroom {
	edupage: Edupage;
	cb_hidden: boolean;
	id: string;
	name: string;
	short: string;
}

interface Class {
	edupage: Edupage;
	grade: number;
	id: string;
	name: string;
	short: string;
	classroom: Classroom;
	teacher: Teacher;
	teacher2?: Teacher;
}

interface Application {
	edupage: Edupage;
	id: string;
	dateFrom: Date | null;
	dateTo: Date | null;
	name: string;
	parameters: string[];
	availableFor: string;
	isEnabled: boolean;
	isTextOptional: boolean;
	isAdvancedWorkflow: boolean;
	isSimpleWorkflow: boolean;
}

interface Plan {
	edupage: Edupage;
	id: string;
	subjectId: string;
	customClassId: string;
	customName: string;
	changedDate: Date;
	year: number;
	settings: any; // Replace 'any' with the appropriate type
	isPublic: boolean;
	state: string;
	isValid: boolean;
	approvedDate: Date | null;
	isApproved: boolean;
	otherId: any; // Replace 'any' with the appropriate type
	topicsCount: number;
	taughtCount: number;
	standardsCount: number;
	timetableGroup: string;
	season: any; // Replace 'any' with the appropriate type
	name: string;
	classOrdering: number;
	isEntireClass: boolean;
	subject: Subject;
	classes: Class[][];
	teacher: Teacher;
	teachers: Teacher[][];
	students: (Student | undefined)[][];
}

interface ASC {}

interface Assignment {
	edupage: Edupage;
	id: string;
	superId: string;
	owner: Teacher;
	subject: Subject;
	title: string;
	details: string;
	creationDate: Date;
	fromDate: Date;
	toDate: Date;
	duration: number;
	period: Period | null;
	testId: string;
	type: string;
	hwkid: string | null;
	cardsCount: number;
	answerCardsCount: number;
	state: string;
	isSeen: boolean;
	comment: string;
	result: string;
	isFinished: boolean;
	stateUpdatedDate: Date;
	stateUpdatedBy: Student;
	grades: any[]; // Replace 'any' with the appropriate type
}

interface Homework {
	edupage: Edupage;
	id: string;
	superId: string;
	owner: Teacher;
	subject: Subject;
	title: string;
	details: string;
	creationDate: Date;
	fromDate: Date;
	toDate: Date;
	duration: number;
	period: Period | null;
	testId: string;
	type: string;
	hwkid: string;
	cardsCount: number;
	answerCardsCount: number;
	state: string;
	isSeen: boolean;
	comment: string;
	result: string;
	isFinished: boolean;
	stateUpdatedDate: Date;
	stateUpdatedBy: Student;
	grades: any[]; // Replace 'any' with the appropriate type
}

interface Test {
	edupage: Edupage;
	id: string;
	superId: string;
	owner: Teacher;
	subject: Subject;
	title: string;
	details: string;
	creationDate: Date;
	fromDate: Date;
	toDate: Date;
	duration: number;
	period: Period | null;
	testId: string;
	type: string;
	hwkid: string | null;
	cardsCount: number;
	answerCardsCount: number;
	state: string;
	isSeen: boolean;
	comment: string;
	result: string;
	isFinished: boolean;
	stateUpdatedDate: Date;
	stateUpdatedBy: Teacher;
	grades: any[]; // Replace 'any' with the appropriate type
}

interface Lesson {
	edupage: Edupage;
	id: string;
	lid: string;
	date: string;
	homeworkNote: undefined | string;
	absentNote: undefined | string;
	curriculum: null | any; // Modify type according to actual data
	onlineLessonURL: null | string;
	isOnlineLesson: boolean;
	period: Period;
	subject: Subject;
	classes: Class[];
	classrooms: Classroom[];
	students: Student[];
	teachers: Teacher[];
	assignments: Assignment[];
}

interface ITimetable {
	edupage: Edupage;
	date: string;
	lessons: Lesson[];
	week: number;
}
interface WidgetProps {
	[key: string]: any;
}

interface Widget {
	widgetid: string;
	widgetClass: string;
	props: WidgetProps;
	widgets: (FileETestWidget | TextETestWidget | QuestionETestWidget)[];
	cardid?: string;
}

interface FileETestWidgetProps extends WidgetProps {
	src: string;
	name: string;
	thumb_l?: string;
	thumb_m?: string;
	thumb_s?: string;
	type: string;
	width?: number;
	height?: number;
	ts?: string;
	id: number;
	aspectRatio?: number;
	cssFlex?: string;
}

interface FileETestWidget extends Widget {
	props: FileETestWidgetProps;
}

interface TextETestWidgetProps extends WidgetProps {
	htmlText: string;
	guid: string;
	isSecured?: boolean;
	_parsedHtmlText?: string;
}

interface TextETestWidget extends Widget {
	props: TextETestWidgetProps;
}

interface QuestionETestWidget extends Widget {
	widgets: (FileETestWidget | TextETestWidget)[];
}
