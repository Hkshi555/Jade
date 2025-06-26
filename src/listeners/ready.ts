import { Listener } from "@sapphire/framework";
import { Client } from "../client/client";
import { ActivityType } from "discord.js";
import axios from "axios"
import config from "../../config.json"

export class ReadyListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options,
	) {
		super(context, {
			...options,
			once: true,
			event: "ready",
		});
	}

	public async run(client: Client) {
		const { username, id } = client.user!;
		this.container.logger.info(
			`Successfully logged in as ${username} (${id})`,
		);
		this.container.logger.info(
			`Mode: ${client.mode == "dev" ? "Development" : "Production"}`,
		);

		// Poll Jellyfin every 10 seconds
	setInterval(async () => {
		const activity = await this.getNowPlayingActivity();
		if (activity) {
			client.user?.setPresence({
				activities: [{
					name: activity,
					type: ActivityType.Watching
				}],
				status: 'online'
			});
		} else {
			client.user?.setPresence({
			});
		}
	}, 10_000);

	}

	public async getNowPlayingActivity() {
		try {
			const res = await axios.get(`${config["jellyfin-url"]}/Sessions`, {
				headers: {
                    'X-Emby-Token': `${process.env.jellyfin_api_key}`,
                }
			})
			const data: JellyfinSession = res.data.filter(session => session.UserName == config["jellyfin-user"])[0];
			console.log(data.NowPlayingItem)
			if (data?.NowPlayingItem) {
				const name = data.NowPlayingItem.Name;
				const type = data.NowPlayingItem.Type;
				const series = data.NowPlayingItem.SeriesName
				const season = data.NowPlayingItem.SeasonName
				const episode = data.NowPlayingItem.IndexNumber

				switch (type) {
					case "Episode": {
						return `${series} - Season ${season.split(" ")[1]} Ep ${episode}`
					}
					case "Video": {
						return `${name}`
					}
				}
			}
			

		} catch (error) {
			this.container.logger.error(
                `Error fetching now playing activity: ${error}`,
            );
        }
		return null
	}
}


export interface JellyfinSession {
  PlayState: PlayState;
  AdditionalUsers: any[]; // Can be typed more strictly if needed
  Capabilities: Capabilities;
  RemoteEndPoint: string;
  PlayableMediaTypes: string[];
  Id: string;
  UserId: string;
  UserName: string;
  Client: string;
  LastActivityDate: string;
  LastPlaybackCheckIn: string;
  DeviceName: string;
  NowPlayingItem?: NowPlayingItem;
  DeviceId: string;
  ApplicationVersion: string;
  TranscodingInfo?: TranscodingInfo;
  IsActive: boolean;
  SupportsMediaControl: boolean;
  SupportsRemoteControl: boolean;
  NowPlayingQueue?: any[]; // Can be typed more specifically
  NowPlayingQueueFullItems?: any[];
  HasCustomDeviceName: boolean;
  PlaylistItemId?: string;
  ServerId: string;
  SupportedCommands: string[];
}

export interface PlayState {
  PositionTicks: number;
  CanSeek: boolean;
  IsPaused: boolean;
  IsMuted: boolean;
  VolumeLevel: number;
  AudioStreamIndex: number;
  SubtitleStreamIndex: number;
  MediaSourceId: string;
  PlayMethod: string;
  RepeatMode: string;
  PlaybackOrder: string;
}

export interface Capabilities {
  PlayableMediaTypes: string[];
  SupportedCommands: string[];
  SupportsMediaControl: boolean;
  SupportsPersistentIdentifier: boolean;
}

export interface NowPlayingItem {
  Name: string;
  ServerId: string;
  Id: string;
  DateCreated: string;
  HasSubtitles: boolean;
  Container: string;
  PremiereDate?: string;
  ExternalUrls?: any[];
  Path: string;
  EnableMediaSourceDisplay: boolean;
  OfficialRating?: string;
  ChannelId?: string | null;
  Overview?: string;
  Taglines?: string[];
  Genres?: string[];
  CommunityRating?: number;
  RunTimeTicks: number;
  ProductionYear?: number;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ProviderIds?: Record<string, string>;
  IsHD: boolean;
  IsFolder: boolean;
  ParentId?: string;
  Type: string;
  Studios?: any[];
  GenreItems?: any[];
  ParentLogoItemId?: string;
  ParentBackdropItemId?: string;
  ParentBackdropImageTags?: string[];
  LocalTrailerCount?: number;
  SeriesName?: string;
  SeriesId?: string;
  SeasonId?: string;
  SpecialFeatureCount?: number;
  PrimaryImageAspectRatio?: number;
  SeriesPrimaryImageTag?: string;
  SeasonName?: string;
  MediaStreams?: any[];
  VideoType?: string;
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  ParentLogoImageTag?: string;
  ImageBlurHashes?: Record<string, any>;
  SeriesStudio?: string;
  ParentThumbItemId?: string;
  ParentThumbImageTag?: string;
  Chapters?: any[];
  Trickplay?: Record<string, any>;
  LocationType: string;
  MediaType: string;
  Width?: number;
  Height?: number;
}

export interface TranscodingInfo {
  AudioCodec: string;
  VideoCodec: string;
  Container: string;
  IsVideoDirect: boolean;
  IsAudioDirect: boolean;
  Bitrate: number;
  Width: number;
  Height: number;
  AudioChannels: number;
  HardwareAccelerationType: string;
  TranscodeReasons: string[];
}
